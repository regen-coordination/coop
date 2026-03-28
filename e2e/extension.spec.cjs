const os = require('node:os');
const path = require('node:path');
const { chromium, expect, test } = require('@playwright/test');
const { ensureExtensionBuilt, extensionDir, rootDir } = require('./helpers/extension-build.cjs');

const closeTimeoutMs = 5000;
const appBaseUrl =
  process.env.COOP_PLAYWRIGHT_BASE_URL ||
  `http://127.0.0.1:${process.env.COOP_PLAYWRIGHT_APP_PORT || process.env.COOP_DEV_APP_PORT || '3001'}`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function withTimeout(promise, timeoutMs, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function isBenignCloseError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if (error.code === 'ENOENT') {
    return true;
  }

  return (
    error instanceof Error &&
    /Target page, context or browser has been closed|Browser has been closed/i.test(error.message)
  );
}

async function closeContextSafely(context) {
  if (!context) {
    return;
  }

  try {
    await Promise.allSettled(
      context.pages().map((page) =>
        withTimeout(page.close(), closeTimeoutMs, 'extension e2e page.close').catch((error) => {
          if (!isBenignCloseError(error)) {
            throw error;
          }
        }),
      ),
    );

    await withTimeout(
      context.close({ reason: 'extension e2e teardown' }),
      closeTimeoutMs,
      'extension e2e context.close',
    );
  } catch (error) {
    if (isBenignCloseError(error)) {
      return;
    }

    const browser = context.browser();
    if (!browser) {
      throw error;
    }

    try {
      await withTimeout(
        browser.close({ reason: 'force extension e2e teardown' }),
        closeTimeoutMs,
        'extension e2e browser.close fallback',
      );
    } catch (browserError) {
      if (isBenignCloseError(browserError)) {
        return;
      }
      throw browserError;
    }
  }
}

async function openOptionalSetup(page) {
  const optionalSetup = page.locator('details.collapsible-card').first();
  const isOpen = await optionalSetup.evaluate((element) => element.hasAttribute('open'));
  if (!isOpen) {
    await optionalSetup.locator('summary').click();
  }
}

async function openFooterTab(page, name) {
  await page
    .locator('nav[aria-label="Sidepanel navigation"]')
    .getByRole('button', { name: new RegExp(escapeRegExp(name), 'i') })
    .click();
}

async function openNestSubTab(page, name) {
  await page
    .locator('nav[aria-label="Nest sections"]')
    .getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}$`, 'i') })
    .click();
}

async function openCoopDetail(page, coopName) {
  await openFooterTab(page, 'Coops');
  const backToAllCoops = page.getByRole('button', { name: /back to all coops/i });
  if (await backToAllCoops.isVisible().catch(() => false)) {
    await backToAllCoops.click();
  }
  await page.locator('.coop-card-button').filter({ hasText: coopName }).first().click();
}

async function findDraftTitleInputByTitle(page, title, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const index = await page
      .locator('.draft-card input[id^="title-"]')
      .evaluateAll(
        (inputs, expectedTitle) => inputs.findIndex((input) => input.value === expectedTitle),
        title,
      );

    if (index >= 0) {
      return page.locator('.draft-card input[id^="title-"]').nth(index);
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Could not find draft title input with title "${title}".`);
}

async function getDashboard(page) {
  const response = await page.evaluate(async () =>
    chrome.runtime.sendMessage({ type: 'get-dashboard' }),
  );
  return response?.ok ? response.data : null;
}

async function waitForCoopCreated(page, coopName, timeoutMs = 30000) {
  await expect
    .poll(
      async () => {
        const dashboard = await getDashboard(page);
        return dashboard?.coops.some((candidate) => candidate.profile.name === coopName) ?? false;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

async function getAgentDashboard(page) {
  const response = await page.evaluate(async () =>
    chrome.runtime.sendMessage({ type: 'get-agent-dashboard' }),
  );
  return response?.ok ? response.data : null;
}

async function launchExtensionProfile(userDataDir) {
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });

  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);

  await cdpSession.send('WebAuthn.enable');
  await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  return {
    context,
    page,
  };
}

test.describe('extension workflow', () => {
  test.describe.configure({ timeout: 180_000 });

  test.skip(
    ({ isMobile }) => isMobile,
    'Extension automation runs only on the desktop Chromium project.',
  );

  test('@flow-board creates a coop, publishes memory, archives a result, and opens the board', async () => {
    ensureExtensionBuilt();

    const creatorUserDataDir = path.join(os.tmpdir(), `coop-e2e-creator-${Date.now()}`);
    const memberUserDataDir = path.join(os.tmpdir(), `coop-e2e-member-${Date.now()}`);
    const creatorProfile = await launchExtensionProfile(creatorUserDataDir);
    let memberProfile;

    try {
      const creatorAppPage = await creatorProfile.context.newPage();
      await creatorAppPage.goto(`${appBaseUrl}/manual-roundup-fixture.html`);
      await creatorProfile.page.bringToFront();

      await creatorProfile.page.fill('#coop-name', 'Coop Town Test');
      await creatorProfile.page.fill(
        '#coop-purpose',
        'Turn loose tabs into shared intelligence and fundable next steps.',
      );
      await creatorProfile.page.fill('#creator-name', 'Ari');
      await creatorProfile.page.fill(
        '#summary',
        'We need a shared membrane for tabs, funding leads, and next steps.',
      );
      await creatorProfile.page.fill(
        '#seed-contribution',
        'I bring loose research tabs and funding opportunities.',
      );
      await openOptionalSetup(creatorProfile.page);
      await creatorProfile.page.fill('#capitalCurrent', 'Funding links live in scattered docs.');
      await creatorProfile.page.fill('#capitalPain', 'Good grant context keeps disappearing.');
      await creatorProfile.page.fill('#capitalImprove', 'Surface fundable leads in shared review.');
      await creatorProfile.page.fill('#impactCurrent', 'Impact evidence is compiled manually.');
      await creatorProfile.page.fill('#impactPain', 'Useful evidence arrives too late.');
      await creatorProfile.page.fill('#impactImprove', 'Keep evidence visible in the coop feed.');
      await creatorProfile.page.fill('#governanceCurrent', 'Calls happen weekly.');
      await creatorProfile.page.fill('#governancePain', 'Follow-up work gets lost after calls.');
      await creatorProfile.page.fill('#governanceImprove', 'Track next steps in the board.');
      await creatorProfile.page.fill('#knowledgeCurrent', 'Resources live in browser tabs.');
      await creatorProfile.page.fill('#knowledgePain', 'People repeat the same research.');
      await creatorProfile.page.fill('#knowledgeImprove', 'Create a shared knowledge commons.');
      await creatorProfile.page
        .getByRole('button', { name: /(launch the coop|start this coop)/i })
        .click();

      await waitForCoopCreated(creatorProfile.page, 'Coop Town Test');
      await expect(
        creatorProfile.page.getByRole('heading', { name: 'Coop Town Test' }),
      ).toBeVisible();
      await expect
        .poll(
          async () => {
            const dashboard = await getDashboard(creatorProfile.page);
            return dashboard?.coops[0]?.onchainState?.safeAddress ?? null;
          },
          {
            timeout: 15000,
          },
        )
        .toMatch(/^0x[a-fA-F0-9]{40}$/);

      await creatorProfile.page.getByRole('button', { name: /invite member/i }).click();
      await expect(creatorProfile.page.locator('#invite-code')).toHaveValue(/.+/, {
        timeout: 15000,
      });
      const inviteCode = await creatorProfile.page.locator('#invite-code').inputValue();

      memberProfile = await launchExtensionProfile(memberUserDataDir);
      await memberProfile.page.bringToFront();
      await expect(memberProfile.page.locator('#join-code')).toBeVisible({
        timeout: 15000,
      });
      await memberProfile.page.fill('#join-code', inviteCode);
      await memberProfile.page.fill('#join-name', 'Mina');
      await memberProfile.page.fill('#join-seed', 'I bring review energy and member context.');
      await memberProfile.page.getByRole('button', { name: /join( this)? coop/i }).click();

      await expect(
        memberProfile.page.getByText(
          /member joined and (seed contribution published|starter note saved)/i,
        ),
      ).toBeVisible({
        timeout: 30000,
      });
      await closeContextSafely(memberProfile.context);
      memberProfile = null;

      await creatorProfile.page.bringToFront();
      await openFooterTab(creatorProfile.page, 'Chickens');
      await creatorProfile.page.getByRole('button', { name: 'Round Up', exact: true }).click();
      const roundupDraftTitleInput = await findDraftTitleInputByTitle(
        creatorProfile.page,
        'Funding roundup for Coop Town Test',
      );
      const roundupDraftCard = roundupDraftTitleInput.locator(
        'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " draft-card ")][1]',
      );
      await expect(roundupDraftTitleInput).toHaveValue('Funding roundup for Coop Town Test', {
        timeout: 15000,
      });
      const publishButton = roundupDraftCard.getByRole('button', { name: /share with coop/i });
      if (!(await publishButton.isVisible().catch(() => false))) {
        await roundupDraftCard.getByRole('button', { name: /ready to share/i }).click();
      }
      await expect(publishButton).toBeVisible({
        timeout: 15000,
      });
      const publishedTitle = await roundupDraftTitleInput.inputValue();
      await publishButton.click();
      await expect(
        creatorProfile.page.getByText(/(draft shared with the coop feed|just landed in the feed)/i),
      ).toBeVisible();
      await expect
        .poll(
          async () => {
            const dashboard = await getDashboard(creatorProfile.page);
            const coop = dashboard?.coops.find(
              (candidate) => candidate.profile.name === 'Coop Town Test',
            );
            return (
              coop?.artifacts.some((artifact) => artifact.title.trim() === publishedTitle.trim()) ??
              false
            );
          },
          {
            timeout: 30000,
          },
        )
        .toBe(true);

      await creatorProfile.page.bringToFront();
      await openCoopDetail(creatorProfile.page, 'Coop Town Test');
      await expect(
        creatorProfile.page.getByRole('heading', {
          name: 'Coop Feed',
        }),
      ).toBeVisible({
        timeout: 15000,
      });
      const sharedFindsSection = creatorProfile.page
        .locator('article.panel-card')
        .filter({
          has: creatorProfile.page.getByRole('heading', {
            name: 'Shared Finds',
          }),
        })
        .first();
      const saveableArtifactCard = sharedFindsSection.locator('.artifact-card').first();
      await expect(saveableArtifactCard).toBeVisible({
        timeout: 15000,
      });
      await saveableArtifactCard
        .getByRole('button', { name: 'Save this find', exact: true })
        .click();
      await expect
        .poll(
          async () => {
            const dashboard = await getDashboard(creatorProfile.page);
            const coop = dashboard?.coops.find(
              (candidate) => candidate.profile.name === 'Coop Town Test',
            );
            return coop?.archiveReceipts.length ?? 0;
          },
          {
            timeout: 30000,
          },
        )
        .toBeGreaterThan(0);

      // Wait for the coop detail UI to render the receipt so boardUrl is fresh
      const savedProofSection = creatorProfile.page
        .locator('article.panel-card')
        .filter({
          has: creatorProfile.page.getByRole('heading', { name: 'Saved Proof' }),
        })
        .first();
      await expect(savedProofSection.locator('.draft-card').first()).toBeVisible({
        timeout: 15000,
      });

      const boardPagePromise = creatorProfile.context.waitForEvent('page');
      await creatorProfile.page.getByRole('button', { name: 'Open Board', exact: true }).click();
      const boardPage = await boardPagePromise;
      await boardPage.waitForLoadState('domcontentloaded');
      await expect(boardPage.getByRole('heading', { name: 'Coop Town Test' })).toBeVisible({
        timeout: 15000,
      });
      const boardSurface = boardPage.getByTestId('coop-board-surface');
      await expect(boardPage.getByRole('heading', { name: /saved proof trail/i })).toBeVisible({
        timeout: 15000,
      });
      await expect(boardSurface.getByText(publishedTitle.trim()).first()).toBeVisible({
        timeout: 15000,
      });
      await expect(boardSurface.getByText('published to coop').first()).toBeVisible({
        timeout: 15000,
      });
      await expect(boardSurface.getByText('archived in').first()).toBeVisible({
        timeout: 15000,
      });
    } finally {
      if (memberProfile) {
        await closeContextSafely(memberProfile.context);
      }
      await closeContextSafely(creatorProfile.context);
    }
  });

  test('@agent-loop shows the agent console and completes a trusted-node agent cycle', async () => {
    ensureExtensionBuilt();

    const creatorUserDataDir = path.join(os.tmpdir(), `coop-agent-loop-${Date.now()}`);
    const creatorProfile = await launchExtensionProfile(creatorUserDataDir);

    try {
      const creatorAppPage = await creatorProfile.context.newPage();
      await creatorAppPage.goto(`${appBaseUrl}/manual-roundup-fixture.html`);
      await creatorAppPage.evaluate(
        (fixture) => {
          document.title = fixture.title;
          const titleTag = document.querySelector('title');
          if (titleTag) {
            titleTag.textContent = fixture.title;
          }
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', fixture.description);
          }
          const mainHeading = document.querySelector('h1');
          if (mainHeading) {
            mainHeading.textContent = fixture.heading;
          }
          const sectionHeadings = [...document.querySelectorAll('h2')];
          if (sectionHeadings[0]) {
            sectionHeadings[0].textContent = fixture.whyHeading;
          }
          if (sectionHeadings[1]) {
            sectionHeadings[1].textContent = fixture.nextHeading;
          }
          const paragraphs = [...document.querySelectorAll('p')];
          fixture.paragraphs.forEach((text, index) => {
            if (paragraphs[index]) {
              paragraphs[index].textContent = text;
            }
          });
        },
        {
          title: 'Capital formation roundup for Agent Loop Coop',
          description:
            'Agent Loop Coop tracks ecological funding opportunities, trusted-node review, shared memory, and capital formation briefs.',
          heading: 'Capital formation roundup for Agent Loop Coop',
          whyHeading: 'Why ecological funding matters',
          nextHeading: 'Trusted-node next step',
          paragraphs: [
            'Agent Loop Coop keeps ecological signals, watershed funding leads, and review-ready briefs in one local roundup.',
            'Trusted members use this capital formation roundup to cluster funding opportunities, preserve shared memory, and prepare review-ready funding briefs for weekly review.',
            'The coop needs capital formation context, ecological opportunity tracking, and trusted-node coordination so the strongest funding opportunities are easy to spot.',
            'Round this page up locally, route it into the Roost, and let the trusted helper build a capital formation brief for Agent Loop Coop.',
          ],
        },
      );
      await creatorProfile.page.bringToFront();

      await creatorProfile.page.fill('#coop-name', 'Agent Loop Coop');
      await creatorProfile.page.fill(
        '#coop-purpose',
        'Turn ecological signals into shared funding opportunities and review-ready briefs.',
      );
      await creatorProfile.page.fill('#creator-name', 'Ari');
      await creatorProfile.page.fill(
        '#summary',
        'We want a trusted-node loop that turns local signals into ecological opportunity briefs.',
      );
      await creatorProfile.page.fill(
        '#seed-contribution',
        'I bring watershed funding leads and operator review context.',
      );
      await openOptionalSetup(creatorProfile.page);
      await creatorProfile.page.fill(
        '#capitalCurrent',
        'Funding research is scattered across tabs.',
      );
      await creatorProfile.page.fill('#capitalPain', 'High-signal opportunities are easy to miss.');
      await creatorProfile.page.fill(
        '#capitalImprove',
        'Generate concise, review-ready funding briefs.',
      );
      await creatorProfile.page.fill('#impactCurrent', 'Impact evidence is reviewed ad hoc.');
      await creatorProfile.page.fill('#impactPain', 'Shared context is stale by the time we meet.');
      await creatorProfile.page.fill(
        '#impactImprove',
        'Keep opportunity context fresh in weekly review.',
      );
      await creatorProfile.page.fill(
        '#governanceCurrent',
        'Trusted members coordinate review manually.',
      );
      await creatorProfile.page.fill(
        '#governancePain',
        'Follow-up actions disappear after the meeting.',
      );
      await creatorProfile.page.fill(
        '#governanceImprove',
        'Let the operator console queue bounded actions.',
      );
      await creatorProfile.page.fill(
        '#knowledgeCurrent',
        'Bioregional research lives in open tabs.',
      );
      await creatorProfile.page.fill('#knowledgePain', 'The same research gets repeated.');
      await creatorProfile.page.fill(
        '#knowledgeImprove',
        'Cluster themes into reusable shared memory.',
      );
      await creatorProfile.page
        .getByRole('button', { name: /(launch the coop|start this coop)/i })
        .click();

      await waitForCoopCreated(creatorProfile.page, 'Agent Loop Coop');

      await openFooterTab(creatorProfile.page, 'Chickens');
      await creatorProfile.page.getByRole('button', { name: 'Round Up', exact: true }).click();
      await expect
        .poll(
          async () => {
            const dashboard = await getDashboard(creatorProfile.page);
            return (dashboard?.drafts.length ?? 0) > 0;
          },
          {
            timeout: 15000,
          },
        )
        .toBe(true);

      await openFooterTab(creatorProfile.page, 'Nest');
      await openNestSubTab(creatorProfile.page, 'Agent');
      await expect(
        creatorProfile.page.getByRole('heading', { name: 'Trusted Helper Runs' }),
      ).toBeVisible();
      await expect(
        creatorProfile.page.getByRole('heading', {
          name: 'What Helpers Noticed',
        }),
      ).toBeVisible();
      await expect(
        creatorProfile.page.getByText('opportunity-extractor', { exact: true }).first(),
      ).toBeVisible();

      await creatorProfile.page
        .getByRole('button', { name: /(run agent cycle|check the helpers)/i })
        .click();
      let capitalFormationCompleted = false;
      let recentRunSummary = [];
      for (let attempt = 0; attempt < 18; attempt += 1) {
        const agentDashboard = await getAgentDashboard(creatorProfile.page);
        recentRunSummary = (agentDashboard?.skillRuns ?? [])
          .slice(-8)
          .map(
            (run) =>
              `${run.skillId}:${run.outputSchemaRef}:${run.status}:${run.provider}:${run.observationId}`,
          );
        capitalFormationCompleted =
          agentDashboard?.skillRuns.some(
            (run) =>
              run.outputSchemaRef === 'capital-formation-brief-output' &&
              run.status === 'completed',
          ) ?? false;
        if (capitalFormationCompleted) {
          break;
        }
        await creatorProfile.page.waitForTimeout(5000);
      }
      expect(
        capitalFormationCompleted,
        `Capital formation run did not complete. Recent skill runs: ${recentRunSummary.join(' | ')}`,
      ).toBe(true);
      const trustedHelperRuns = creatorProfile.page
        .locator('details.collapsible-card')
        .filter({
          has: creatorProfile.page.getByRole('heading', {
            name: 'Trusted Helper Runs',
          }),
        })
        .first();
      const trustedHelperRunsOpen = await trustedHelperRuns.evaluate((element) =>
        element.hasAttribute('open'),
      );
      if (!trustedHelperRunsOpen) {
        await trustedHelperRuns.locator('summary').click();
      }
      const capitalFormationRun = trustedHelperRuns
        .locator('.operator-log-entry')
        .filter({
          has: creatorProfile.page.getByText('capital-formation-brief-output', { exact: true }),
        })
        .first();
      await expect(capitalFormationRun).toBeVisible({
        timeout: 30000,
      });
      await expect(
        capitalFormationRun.getByText('capital-formation-brief', { exact: true }).first(),
      ).toBeVisible({
        timeout: 30000,
      });

      await expect
        .poll(
          async () => {
            const dashboard = await getDashboard(creatorProfile.page);
            if (!dashboard) {
              return [];
            }
            return dashboard.drafts
              .filter(
                (draft) =>
                  draft.provenance?.type === 'agent' &&
                  draft.provenance.skillId === 'capital-formation-brief',
              )
              .map((draft) => draft.title);
          },
          {
            timeout: 30000,
          },
        )
        .toContainEqual(expect.stringMatching(/capital formation brief/i));
    } finally {
      await closeContextSafely(creatorProfile.context);
    }
  });

  test('provisions a member garden account and hatches a sidepanel garden pass in mock-path modes', async ({
    browserName,
  }, testInfo) => {
    void browserName;
    testInfo.setTimeout(300_000);
    ensureExtensionBuilt();

    const creatorUserDataDir = path.join(os.tmpdir(), `coop-sidepanel-onchain-${Date.now()}`);
    const creatorProfile = await launchExtensionProfile(creatorUserDataDir);

    try {
      await creatorProfile.page.fill('#coop-name', 'Garden Pass Coop');
      await creatorProfile.page.fill(
        '#coop-purpose',
        'Exercise sidepanel member-account and garden-pass actions before release.',
      );
      await creatorProfile.page.fill('#creator-name', 'Ari');
      await creatorProfile.page.fill(
        '#summary',
        'We need stable browser coverage for member provisioning and bounded garden passes.',
      );
      await creatorProfile.page.fill(
        '#seed-contribution',
        'I bring the first Green Goods operator rehearsal for this browser profile.',
      );
      await openOptionalSetup(creatorProfile.page);
      await creatorProfile.page.check('#green-goods-garden');
      await creatorProfile.page.fill(
        '#capitalCurrent',
        'Operator readiness is mostly verified in unit tests.',
      );
      await creatorProfile.page.fill(
        '#capitalPain',
        'Release regressions can still hide in Chrome.',
      );
      await creatorProfile.page.fill(
        '#capitalImprove',
        'Exercise member-account and garden-pass flows in the real sidepanel.',
      );
      await creatorProfile.page.fill(
        '#impactCurrent',
        'Garden work is rehearsed outside the browser.',
      );
      await creatorProfile.page.fill(
        '#impactPain',
        'Provisioning and pass issuance need browser-backed validation.',
      );
      await creatorProfile.page.fill(
        '#impactImprove',
        'Keep the operator path legible in the release slice.',
      );
      await creatorProfile.page.fill(
        '#governanceCurrent',
        'Trusted members issue capabilities manually.',
      );
      await creatorProfile.page.fill(
        '#governancePain',
        'Session controls can drift without end-to-end browser checks.',
      );
      await creatorProfile.page.fill(
        '#governanceImprove',
        'Confirm garden-pass issuance from the sidepanel itself.',
      );
      await creatorProfile.page.fill('#knowledgeCurrent', 'Green Goods setup notes live in docs.');
      await creatorProfile.page.fill(
        '#knowledgePain',
        'The real sidepanel path is easy to under-test.',
      );
      await creatorProfile.page.fill(
        '#knowledgeImprove',
        'Capture the browser path in automated release checks.',
      );
      await creatorProfile.page
        .getByRole('button', { name: /(launch the coop|start this coop)/i })
        .click();

      await waitForCoopCreated(creatorProfile.page, 'Garden Pass Coop');
      await expect(
        creatorProfile.page.getByRole('heading', { name: 'Garden Pass Coop' }),
      ).toBeVisible();

      // Creation handler may race setPanelTab('nest') after loadDashboard(),
      // so retry the Roost switch until the tab actually sticks.
      await expect
        .poll(
          async () => {
            const heading = creatorProfile.page.getByRole('heading', {
              name: 'Green Goods Access',
            });
            const visible = await heading.isVisible().catch(() => false);
            if (!visible) {
              await openFooterTab(creatorProfile.page, 'Roost');
            }
            return visible;
          },
          { timeout: 30_000 },
        )
        .toBe(true);
      await creatorProfile.page
        .getByRole('button', { name: /provision my garden account/i })
        .click();
      await expect(
        creatorProfile.page.getByText(/member smart account predicted and stored on this browser/i),
      ).toBeVisible({
        timeout: 30_000,
      });
      await openFooterTab(creatorProfile.page, 'Roost');
      await expect(
        creatorProfile.page.getByRole('button', { name: /refresh local garden account/i }),
      ).toBeVisible({
        timeout: 30_000,
      });

      await openFooterTab(creatorProfile.page, 'Nest');
      await openNestSubTab(creatorProfile.page, 'Agent');

      const gardenPassSection = creatorProfile.page
        .locator('details.collapsible-card')
        .filter({
          has: creatorProfile.page.getByRole('heading', { name: 'Garden Passes' }),
        })
        .first();
      const gardenPassSectionOpen = await gardenPassSection.evaluate((element) =>
        element.hasAttribute('open'),
      );
      if (!gardenPassSectionOpen) {
        await gardenPassSection.locator('summary').click();
      }

      const hatchGardenPassButton = gardenPassSection.getByRole('button', {
        name: /hatch (setup|garden) pass/i,
      });
      await expect(hatchGardenPassButton).toBeVisible({
        timeout: 30_000,
      });
      await hatchGardenPassButton.click();

      await expect
        .poll(
          async () =>
            (await getDashboard(creatorProfile.page))?.operator?.sessionCapabilities.length ?? 0,
          {
            timeout: 30_000,
          },
        )
        .toBeGreaterThan(0);
      await expect
        .poll(
          async () =>
            (await getDashboard(creatorProfile.page))?.operator?.sessionCapabilities[0]?.scope
              .allowedActions.length ?? 0,
          {
            timeout: 30_000,
          },
        )
        .toBeGreaterThan(0);
      await expect
        .poll(
          async () =>
            (await getDashboard(creatorProfile.page))?.operator?.sessionCapabilityLog[0]?.detail ??
            null,
          {
            timeout: 30_000,
          },
        )
        .toContain('Issued session key');
    } finally {
      await closeContextSafely(creatorProfile.context);
    }
  });
});
