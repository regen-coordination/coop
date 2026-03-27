const os = require('node:os');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { ensureExtensionBuilt, extensionDir } = require('../e2e/helpers/extension-build.cjs');

const appBaseUrl = process.env.COOP_PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

async function getDashboard(page) {
  const response = await page.evaluate(async () =>
    chrome.runtime.sendMessage({ type: 'get-dashboard' }),
  );
  return response?.ok ? response.data : null;
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
  return { context, page };
}

function summarizeAgentDashboard(agentDashboard) {
  if (!agentDashboard) return null;
  return {
    observations: agentDashboard.observations.slice(-6).map((obs) => ({
      id: obs.id,
      trigger: obs.trigger,
      status: obs.status,
      coopId: obs.coopId,
      draftId: obs.draftId,
      blockedReason: obs.blockedReason,
      title: obs.title,
    })),
    plans: agentDashboard.plans.slice(-6).map((plan) => ({
      id: plan.id,
      observationId: plan.observationId,
      status: plan.status,
      confidence: plan.confidence,
      goal: plan.goal,
      steps: plan.steps.map((step) => ({ skillId: step.skillId, status: step.status })),
      actionProposals: plan.actionProposals.map((proposal) => proposal.actionClass),
      failureReason: plan.failureReason,
    })),
    skillRuns: agentDashboard.skillRuns.slice(-12).map((run) => ({
      skillId: run.skillId,
      outputSchemaRef: run.outputSchemaRef,
      status: run.status,
      provider: run.provider,
      observationId: run.observationId,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    })),
  };
}

(async () => {
  ensureExtensionBuilt(process.env);
  const dir = path.join(os.tmpdir(), `coop-agent-debug-${Date.now()}`);
  const profile = await launchExtensionProfile(dir);
  try {
    const appPage = await profile.context.newPage();
    await appPage.goto(`${appBaseUrl}/manual-roundup-fixture.html`);
    await profile.page.bringToFront();

    await profile.page.fill('#coop-name', 'Coop Town Test');
    await profile.page.fill(
      '#coop-purpose',
      'Turn loose tabs into shared intelligence and fundable next steps.',
    );
    await profile.page.fill('#creator-name', 'Ari');
    await profile.page.fill(
      '#summary',
      'We need a shared membrane for tabs, funding leads, and next steps.',
    );
    await profile.page.fill(
      '#seed-contribution',
      'I bring loose research tabs and funding opportunities.',
    );
    await openOptionalSetup(profile.page);
    await profile.page.fill('#capitalCurrent', 'Funding links live in scattered docs.');
    await profile.page.fill('#capitalPain', 'Good grant context keeps disappearing.');
    await profile.page.fill('#capitalImprove', 'Surface fundable leads in shared review.');
    await profile.page.fill('#impactCurrent', 'Climate wins hide inside research rabbit holes.');
    await profile.page.fill('#impactPain', 'The team loses track of what matters for outcomes.');
    await profile.page.fill('#impactImprove', 'Keep opportunity context fresh in weekly review.');
    await profile.page.fill('#governanceCurrent', 'Trusted members coordinate review manually.');
    await profile.page.fill('#governancePain', 'Follow-up actions disappear after the meeting.');
    await profile.page.fill(
      '#governanceImprove',
      'Let the operator console queue bounded actions.',
    );
    await profile.page.fill('#knowledgeCurrent', 'Bioregional research lives in open tabs.');
    await profile.page.fill('#knowledgePain', 'The same research gets repeated.');
    await profile.page.fill('#knowledgeImprove', 'Cluster themes into reusable shared memory.');
    await profile.page.getByRole('button', { name: /(launch the coop|start this coop)/i }).click();
    await profile.page.getByText(/coop created\./i).waitFor({ timeout: 30000 });

    await openFooterTab(profile.page, 'Chickens');
    await profile.page.getByRole('button', { name: 'Round Up', exact: true }).click();

    const dashboardStart = Date.now();
    while (Date.now() - dashboardStart < 15000) {
      const dashboard = await getDashboard(profile.page);
      if ((dashboard?.drafts.length ?? 0) > 0) break;
      await profile.page.waitForTimeout(500);
    }

    const dashboardBefore = await getDashboard(profile.page);
    const agentBefore = await getAgentDashboard(profile.page);
    console.log(
      'DASHBOARD_BEFORE',
      JSON.stringify(
        {
          drafts: dashboardBefore?.drafts.map((draft) => ({
            id: draft.id,
            title: draft.title,
            confidence: draft.confidence,
            targetCoops: draft.suggestedTargetCoopIds,
            status: draft.status,
            provenance: draft.provenance,
          })),
          agent: summarizeAgentDashboard(agentBefore),
        },
        null,
        2,
      ),
    );

    await openFooterTab(profile.page, 'Nest');
    await openNestSubTab(profile.page, 'Agent');
    await profile.page
      .getByRole('button', { name: /(run agent cycle|check the helpers)/i })
      .click();

    for (let attempt = 1; attempt <= 24; attempt += 1) {
      const dashboard = await getDashboard(profile.page);
      const agent = await getAgentDashboard(profile.page);
      const capitalRun = agent?.skillRuns.find(
        (run) => run.outputSchemaRef === 'capital-formation-brief-output',
      );
      const capitalDrafts = (dashboard?.drafts ?? []).filter(
        (draft) =>
          draft.provenance?.type === 'agent' &&
          draft.provenance.skillId === 'capital-formation-brief',
      );
      console.log(
        `ATTEMPT_${attempt}`,
        JSON.stringify(
          {
            capitalRun,
            capitalDraftTitles: capitalDrafts.map((draft) => draft.title),
            observations: agent?.observations.slice(-4).map((obs) => ({
              trigger: obs.trigger,
              status: obs.status,
              blockedReason: obs.blockedReason,
              title: obs.title,
            })),
            plans: agent?.plans.slice(-4).map((plan) => ({
              status: plan.status,
              goal: plan.goal,
              failureReason: plan.failureReason,
              steps: plan.steps.map((step) => ({ skillId: step.skillId, status: step.status })),
            })),
            skillRuns: agent?.skillRuns.slice(-8).map((run) => ({
              skillId: run.skillId,
              outputSchemaRef: run.outputSchemaRef,
              status: run.status,
              provider: run.provider,
              errorMessage: run.errorMessage,
            })),
          },
          null,
          2,
        ),
      );
      if (capitalRun?.status === 'completed' && capitalDrafts.length > 0) {
        break;
      }
      await profile.page.waitForTimeout(5000);
    }
  } catch (error) {
    console.error('DEBUG_SCRIPT_ERROR', error);
    process.exitCode = 1;
  } finally {
    await profile.context.close();
  }
})();
