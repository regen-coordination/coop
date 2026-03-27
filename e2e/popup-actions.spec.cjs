const os = require('node:os');
const path = require('node:path');
const { chromium, expect, test } = require('@playwright/test');
const { ensureExtensionBuilt, extensionDir } = require('./helpers/extension-build.cjs');

const closeTimeoutMs = 15_000;
const appBaseUrl =
  process.env.COOP_PLAYWRIGHT_BASE_URL ||
  `http://127.0.0.1:${process.env.COOP_PLAYWRIGHT_APP_PORT || process.env.COOP_DEV_APP_PORT || '3001'}`;

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

  const browser = context.browser();

  try {
    await Promise.allSettled(
      context.pages().map((page) =>
        withTimeout(page.close(), closeTimeoutMs, 'popup actions page.close').catch((error) => {
          if (!isBenignCloseError(error)) {
            throw error;
          }
        }),
      ),
    );

    await withTimeout(
      context.close({ reason: 'popup actions e2e teardown' }),
      closeTimeoutMs,
      'popup actions context.close',
    );

    if (browser) {
      await withTimeout(
        browser.close({ reason: 'popup actions browser.close post-context teardown' }),
        closeTimeoutMs,
        'popup actions browser.close',
      ).catch((error) => {
        if (!isBenignCloseError(error)) {
          throw error;
        }
      });
    }
  } catch (error) {
    if (isBenignCloseError(error)) {
      return;
    }

    if (!browser) {
      throw error;
    }

    try {
      await withTimeout(
        browser.close({ reason: 'force popup actions e2e teardown' }),
        closeTimeoutMs,
        'popup actions browser.close fallback',
      );
    } catch (browserError) {
      if (
        isBenignCloseError(browserError) ||
        (browserError instanceof Error && browserError.message.includes('timed out'))
      ) {
        return;
      }
      throw browserError;
    }
  }
}

function popupCoopPayload(coopName) {
  return {
    coopName,
    purpose: 'Keep popup actions reliable across capture, save, and review flows.',
    creatorDisplayName: 'Popup Tester',
    captureMode: 'manual',
    seedContribution: 'I bring popup action coverage and persistence checks.',
    setupInsights: {
      summary: 'Need stable popup action coverage for capture, notes, and review persistence.',
      crossCuttingPainPoints: [
        'Popup flows have less browser-level action coverage than sidepanel flows.',
      ],
      crossCuttingOpportunities: [
        'Exercise popup actions in a real extension session before releases.',
      ],
      lenses: [
        {
          lens: 'capital-formation',
          currentState: 'Popup smoke flows are lightly rehearsed in Chrome.',
          painPoints: 'Capture regressions are easy to miss without browser coverage.',
          improvements: 'Run popup smoke actions against a live extension profile.',
        },
        {
          lens: 'impact-reporting',
          currentState: 'Popup persistence confidence comes mostly from unit tests.',
          painPoints: 'Saved captures need browser-backed confirmation.',
          improvements: 'Verify receiver intake and draft state through the runtime dashboard.',
        },
        {
          lens: 'governance-coordination',
          currentState: 'Popup workflows are reviewed manually.',
          painPoints: 'Failures can leave the popup in a broken state.',
          improvements: 'Confirm the popup still accepts follow-up actions after errors.',
        },
        {
          lens: 'knowledge-garden-resources',
          currentState: 'Local notes and files are checked piecemeal.',
          painPoints: 'Review dialogs need save and cancel confidence in the browser.',
          improvements: 'Cover screenshot, file, and audio edge states end to end.',
        },
      ],
    },
  };
}

async function getDashboard(page) {
  const response = await page.evaluate(async () =>
    chrome.runtime.sendMessage({ type: 'get-dashboard' }),
  );
  return response?.ok ? response.data : null;
}

async function seedPopupCoop(popupPage, coopName) {
  const response = await popupPage.evaluate(async (payload) => {
    return chrome.runtime.sendMessage({
      type: 'create-coop',
      payload,
    });
  }, popupCoopPayload(coopName));

  if (!response?.ok) {
    throw new Error(response?.error ?? 'Could not create popup test coop.');
  }

  const creator = response.data?.members?.[0];
  if (!creator?.address || !creator?.displayName) {
    throw new Error('Popup smoke seed coop did not return a creator member.');
  }

  const authResponse = await popupPage.evaluate(
    async (payload) => {
      return chrome.runtime.sendMessage({
        type: 'set-auth-session',
        payload,
      });
    },
    {
      authMode: creator.authMode ?? 'passkey',
      createdAt: new Date().toISOString(),
      displayName: creator.displayName,
      identityWarning:
        creator.identityWarning ??
        `${creator.displayName}'s passkey is stored on this device profile. Clearing extension data may remove access to this account.`,
      primaryAddress: creator.address,
    },
  );

  if (!authResponse?.ok) {
    throw new Error(authResponse?.error ?? 'Could not seed popup auth session.');
  }

  await popupPage.reload();
  await popupPage.waitForLoadState('domcontentloaded');
  await popupPage.waitForSelector('.popup-app', { timeout: 30_000 });
  await expect(popupPage.getByRole('button', { name: 'Roundup Chickens' })).toBeVisible({
    timeout: 30_000,
  });
}

async function launchPopupProfile(userDataDir, options = {}) {
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });

  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(worker.url()).host;
  const popupPage = await context.newPage();

  if (typeof options.beforePopupLoad === 'function') {
    await options.beforePopupLoad(popupPage);
  }

  await popupPage.setViewportSize({ width: 360, height: 520 });
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await popupPage.waitForLoadState('domcontentloaded');
  await popupPage.waitForSelector('.popup-app', { timeout: 30_000 });

  return {
    context,
    extensionId,
    popupPage,
    worker,
  };
}

async function openStandardPage(context, suffix = '') {
  const page = await context.newPage();
  const targetUrl = `${appBaseUrl}/manual-roundup-fixture.html${suffix}`;
  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.bringToFront();
  return page;
}

async function goHome(popupPage) {
  const homeButton = popupPage.getByRole('button', { name: 'Home' });
  if (await homeButton.count()) {
    await homeButton.click();
  }
}

async function waitForDraftCount(popupPage, count) {
  await expect
    .poll(async () => (await getDashboard(popupPage))?.drafts.length ?? 0, {
      timeout: 30_000,
    })
    .toBe(count);
}

async function waitForReceiverIntakeCount(popupPage, count) {
  await expect
    .poll(async () => (await getDashboard(popupPage))?.receiverIntake.length ?? 0, {
      timeout: 30_000,
    })
    .toBe(count);
}

async function clickWithoutFocusing(locator) {
  await locator.evaluate((button) => button.click());
}

async function createActionPopupDriver(context, worker) {
  const browser = context.browser();
  if (!browser) {
    throw new Error('Could not access the browser for popup action automation.');
  }

  const cdp = await browser.newBrowserCDPSession();
  const pending = new Map();
  let nextId = 1;

  cdp.on('Target.receivedMessageFromTarget', (event) => {
    const message = JSON.parse(event.message);
    if (!message.id) {
      return;
    }

    const resolver = pending.get(message.id);
    if (!resolver) {
      return;
    }

    pending.delete(message.id);
    if (message.error) {
      resolver.reject(new Error(message.error.message || String(message.error)));
      return;
    }

    resolver.resolve(message.result);
  });

  async function sendToTarget(sessionId, method, params = {}) {
    return await new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      cdp
        .send('Target.sendMessageToTarget', {
          sessionId,
          message: JSON.stringify({ id, method, params }),
        })
        .catch(reject);
    });
  }

  async function evaluate(sessionId, expression) {
    const response = await sendToTarget(sessionId, 'Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text || 'Popup evaluation failed.');
    }

    return response.result?.value;
  }

  return {
    async open() {
      await worker.evaluate(async () => {
        await chrome.action.openPopup();
      });

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const targets = await cdp.send('Target.getTargets');
        const popupTarget = targets.targetInfos.find((target) =>
          target.url.endsWith('/popup.html'),
        );
        if (popupTarget) {
          const { sessionId } = await cdp.send('Target.attachToTarget', {
            targetId: popupTarget.targetId,
            flatten: false,
          });
          await sendToTarget(sessionId, 'Runtime.enable');
          return sessionId;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      throw new Error('Could not attach to the real extension action popup.');
    },
    async clickButton(sessionId, label) {
      const encoded = JSON.stringify(label);
      return evaluate(
        sessionId,
        `(() => {
          const button = [...document.querySelectorAll('button')].find((node) =>
            (node.textContent || '').includes(${encoded}) || node.getAttribute('aria-label') === ${encoded},
          );
          if (!button) {
            throw new Error('Missing popup button: ' + ${encoded});
          }
          button.click();
          return true;
        })()`,
      );
    },
    async fillCaptureReview(sessionId, values) {
      return evaluate(
        sessionId,
        `(() => {
          const fields = [...document.querySelectorAll('.popup-dialog__field')];
          const titleField = fields.find((node) => node.textContent.includes('Title'));
          const contextField = fields.find((node) => node.textContent.includes('Context'));
          const input = titleField?.querySelector('input');
          const textarea = contextField?.querySelector('textarea') ?? document.querySelector('textarea');
          if (!input || !textarea) {
            throw new Error('Capture review fields are not available.');
          }
          input.value = ${JSON.stringify(values.title)};
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.value = ${JSON.stringify(values.context)};
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        })()`,
      );
    },
    async hasDialog(sessionId) {
      return Boolean(await evaluate(sessionId, `Boolean(document.querySelector('dialog[open]'))`));
    },
    async bodyText(sessionId) {
      return (await evaluate(sessionId, 'document.body.innerText')) ?? '';
    },
  };
}

test.describe('popup action smoke', () => {
  test.describe.configure({ timeout: 180_000 });

  test.skip(
    ({ isMobile }) => isMobile,
    'Popup action automation runs only on the desktop Chromium project.',
  );

  test.beforeAll(() => {
    ensureExtensionBuilt();
  });

  test('rounds up open pages from the real popup into popup drafts', async () => {
    const profile = await launchPopupProfile(
      path.join(os.tmpdir(), `coop-popup-actions-roundup-${Date.now()}`),
    );

    try {
      const actionPopup = await createActionPopupDriver(profile.context, profile.worker);
      await seedPopupCoop(profile.popupPage, `Popup Smoke ${Date.now()}`);
      await openStandardPage(profile.context, '?roundup=1');

      const baselineDraftCount = (await getDashboard(profile.popupPage))?.drafts.length ?? 0;
      await expect
        .poll(async () => (await getDashboard(profile.popupPage))?.drafts.length ?? 0)
        .toBe(baselineDraftCount);

      const popupSessionId = await actionPopup.open();
      await actionPopup.clickButton(popupSessionId, 'Roundup Chickens');
      await expect
        .poll(async () => (await getDashboard(profile.popupPage))?.drafts.length ?? 0, {
          timeout: 30_000,
        })
        .toBeGreaterThan(baselineDraftCount);
      await expect
        .poll(async () => {
          return ((await getDashboard(profile.popupPage))?.drafts ?? [])
            .map((draft) => draft.title)
            .join('\n');
        })
        .toContain('Funding roundup for Coop Town Test');
    } finally {
      await closeContextSafely(profile.context);
    }
  });

  test('surfaces the precise screenshot permission error when automation lacks a real activeTab grant', async () => {
    const profile = await launchPopupProfile(
      path.join(os.tmpdir(), `coop-popup-actions-screenshot-${Date.now()}`),
    );

    try {
      const actionPopup = await createActionPopupDriver(profile.context, profile.worker);
      await seedPopupCoop(profile.popupPage, `Popup Screenshot ${Date.now()}`);
      const targetPage = await openStandardPage(profile.context, '?screenshot=1');

      await targetPage.bringToFront();
      const popupSessionId = await actionPopup.open();
      await actionPopup.clickButton(popupSessionId, 'Screenshot');
      await expect
        .poll(() => actionPopup.bodyText(popupSessionId), {
          timeout: 30_000,
        })
        .toContain("Either the '<all_urls>' or 'activeTab' permission is required.");
      await expect
        .poll(() => actionPopup.hasDialog(popupSessionId), { timeout: 30_000 })
        .toBe(false);
    } finally {
      await closeContextSafely(profile.context);
    }
  });

  test('blocks screenshot capture from the popup surface before opening review', async () => {
    const profile = await launchPopupProfile(
      path.join(os.tmpdir(), `coop-popup-actions-screenshot-gate-${Date.now()}`),
    );

    try {
      await seedPopupCoop(profile.popupPage, `Popup Screenshot Gate ${Date.now()}`);
      await profile.popupPage.bringToFront();

      await profile.popupPage.getByRole('button', { name: 'Screenshot' }).click();

      await expect(
        profile.popupPage.getByText('Open a standard web page before taking a screenshot.'),
      ).toBeVisible({
        timeout: 30_000,
      });
      await expect(profile.popupPage.getByRole('dialog')).toHaveCount(0);
    } finally {
      await closeContextSafely(profile.context);
    }
  });

  test('opens file review, supports cancel, and saves the reviewed file to receiver intake', async () => {
    const profile = await launchPopupProfile(
      path.join(os.tmpdir(), `coop-popup-actions-file-${Date.now()}`),
    );

    try {
      await seedPopupCoop(profile.popupPage, `Popup File ${Date.now()}`);

      const fileInput = profile.popupPage.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'popup-notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Popup file capture that should persist after review.'),
      });

      await expect(profile.popupPage.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
      await profile.popupPage.getByRole('button', { name: 'Cancel' }).click();
      await expect(profile.popupPage.getByRole('dialog')).toHaveCount(0);

      await fileInput.setInputFiles({
        name: 'popup-notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Popup file capture that should persist after review.'),
      });

      await expect(profile.popupPage.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
      await profile.popupPage.getByRole('textbox', { name: 'Title' }).fill('Popup file proof');
      await profile.popupPage
        .getByRole('textbox', { name: 'Context' })
        .fill('Reviewed and saved from the popup browser smoke suite.');
      await profile.popupPage.getByRole('button', { name: 'Save to Pocket Coop' }).click();

      await waitForReceiverIntakeCount(profile.popupPage, 1);
      await expect(profile.popupPage.getByRole('dialog')).toHaveCount(0);
    } finally {
      await closeContextSafely(profile.context);
    }
  });

  test('shows microphone denial recovery and retries the popup recording request', async () => {
    const profile = await launchPopupProfile(
      path.join(os.tmpdir(), `coop-popup-actions-audio-${Date.now()}`),
      {
        beforePopupLoad: async (popupPage) => {
          await popupPage.addInitScript(() => {
            globalThis.__coopGetUserMediaCalls = 0;

            Object.defineProperty(navigator, 'mediaDevices', {
              configurable: true,
              value: {
                getUserMedia: async () => {
                  globalThis.__coopGetUserMediaCalls += 1;
                  const error = new Error('NotAllowedError');
                  error.name = 'NotAllowedError';
                  throw error;
                },
              },
            });

            Object.defineProperty(globalThis, 'MediaRecorder', {
              configurable: true,
              value: class FakeMediaRecorder {},
            });
          });
        },
      },
    );

    try {
      await seedPopupCoop(profile.popupPage, `Popup Audio ${Date.now()}`);
      await profile.popupPage.getByRole('button', { name: 'Audio' }).click();

      await expect(profile.popupPage.getByText('Microphone access needed')).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        profile.popupPage.getByText('Microphone access was denied. Allow it and try again.'),
      ).toBeVisible();

      await profile.popupPage.getByRole('button', { name: 'Try Again' }).click();
      await expect
        .poll(
          async () =>
            await profile.popupPage.evaluate(() => globalThis.__coopGetUserMediaCalls ?? 0),
          { timeout: 30_000 },
        )
        .toBe(2);
      await expect(profile.popupPage.getByRole('button', { name: 'Retry Audio' })).toBeVisible();
    } finally {
      await closeContextSafely(profile.context);
    }
  });

  test('stays usable after a failed popup capture action', async () => {
    const profile = await launchPopupProfile(
      path.join(os.tmpdir(), `coop-popup-actions-recovery-${Date.now()}`),
    );

    try {
      await seedPopupCoop(profile.popupPage, `Popup Recovery ${Date.now()}`);
      await profile.popupPage.bringToFront();

      await profile.popupPage.getByRole('button', { name: 'Capture Tab' }).click();
      await expect(
        profile.popupPage.getByText('Open a standard web page before capturing this tab.'),
      ).toBeVisible({
        timeout: 30_000,
      });

      await profile.popupPage
        .getByRole('textbox', { name: 'Note' })
        .fill('Popup still accepts notes after a failed capture attempt.');
      await profile.popupPage.getByRole('button', { name: 'Save note' }).click();

      await expect(profile.popupPage.getByText('Note hatched into your roost.')).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await closeContextSafely(profile.context);
    }
  });
});
