const os = require('node:os');
const path = require('node:path');
const { chromium, expect, test } = require('@playwright/test');
const { ensureExtensionBuilt, extensionDir } = require('./helpers/extension-build.cjs');
const { createMockMemberIdentity } = require('./helpers/mock-auth.cjs');

const closeTimeoutMs = 5000;

function withTimeout(promise, timeoutMs, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function isBenignCloseError(error) {
  if (!error || typeof error !== 'object') return false;
  if (error.code === 'ENOENT') return true;
  return (
    error instanceof Error &&
    /Target page, context or browser has been closed|Browser has been closed/i.test(error.message)
  );
}

async function closeContextSafely(context) {
  if (!context) return;
  try {
    await Promise.allSettled(
      context.pages().map((page) =>
        withTimeout(page.close(), closeTimeoutMs, 'page.close').catch((error) => {
          if (!isBenignCloseError(error)) throw error;
        }),
      ),
    );
    await withTimeout(
      context.close({ reason: 'visual test teardown' }),
      closeTimeoutMs,
      'context.close',
    );
  } catch (error) {
    if (isBenignCloseError(error)) return;
    const browser = context.browser();
    if (!browser) throw error;
    try {
      await withTimeout(browser.close({ reason: 'force teardown' }), closeTimeoutMs);
    } catch (browserError) {
      if (!isBenignCloseError(browserError)) throw browserError;
    }
  }
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    document.body.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
    document.body.style.colorScheme = t;
  }, theme);
  // Let CSS transitions settle
  await page.waitForTimeout(200);
}

async function ensurePopupHasCoop(page) {
  const homeButton = page.getByRole('button', { name: 'Home' });
  if (await homeButton.isVisible().catch(() => false)) {
    return;
  }

  const { member: creator, session } = createMockMemberIdentity({
    displayName: 'Ari',
    role: 'creator',
  });
  await page.evaluate(async (payload) => {
    await chrome.runtime.sendMessage({
      type: 'set-auth-session',
      payload,
    });
  }, session);

  await page.evaluate(async (creatorPayload) => {
    await chrome.runtime.sendMessage({
      type: 'create-coop',
      payload: {
        coopName: 'Popup Visual Coop',
        purpose: 'Capture popup alignment snapshots across the main tabs.',
        creatorDisplayName: 'Ari',
        captureMode: 'manual',
        seedContribution: 'I bring popup QA notes and UI regression checks.',
        setupInsights: {
          summary: 'Need a stable popup shell for home, chickens, and feed.',
          crossCuttingPainPoints: ['Popup layout shifts make regressions harder to notice'],
          crossCuttingOpportunities: ['Snapshot the popup tabs after each visual change'],
          lenses: [
            {
              lens: 'capital-formation',
              currentState: 'Popup regressions are tracked ad hoc.',
              painPoints: 'Visual changes are easy to miss across tabs.',
              improvements: 'Snapshot the popup main tabs after UI changes.',
            },
            {
              lens: 'impact-reporting',
              currentState: 'QA findings are collected manually.',
              painPoints: 'Layout drift is hard to compare over time.',
              improvements: 'Keep stable screenshot references for the popup.',
            },
            {
              lens: 'governance-coordination',
              currentState: 'Popup polish decisions are reviewed case by case.',
              painPoints: 'Regressions slip through when tests lack visual coverage.',
              improvements: 'Use popup snapshots to support review decisions.',
            },
            {
              lens: 'knowledge-garden-resources',
              currentState: 'Popup checks happen manually.',
              painPoints: 'UI regressions can hide between tabs.',
              improvements: 'Keep main-tab snapshots in the visual suite.',
            },
          ],
        },
        creator: creatorPayload,
      },
    });
  }, creator);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('.popup-app', { timeout: 10_000 });
  await homeButton.waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('popup visual snapshots', () => {
  test.describe.configure({ timeout: 120_000 });

  let context;
  let page;
  let extensionId;

  test.beforeAll(async ({ isMobile }) => {
    test.skip(isMobile, 'Extension visual tests run only on the desktop Chromium project.');
    ensureExtensionBuilt();

    const userDataDir = path.join(os.tmpdir(), `coop-visual-popup-${Date.now()}`);
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
    });

    const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
    extensionId = new URL(worker.url()).host;
  });

  test.afterAll(async () => {
    await closeContextSafely(context);
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    await page.setViewportSize({ width: 360, height: 520 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for initial render
    await page.waitForSelector('.popup-app', { timeout: 10_000 });
  });

  test.afterEach(async () => {
    if (page) {
      await page.close().catch(() => {});
    }
  });

  for (const theme of ['light', 'dark']) {
    test(`home screen – ${theme}`, async () => {
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`popup-home-${theme}.png`);
    });

    test(`profile panel – ${theme}`, async () => {
      await setTheme(page, theme);
      const profileButton = page.getByRole('button', { name: /profile|settings/i });
      if (await profileButton.isVisible().catch(() => false)) {
        await profileButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot(`popup-profile-${theme}.png`);
    });

    test(`create coop screen – ${theme}`, async () => {
      await setTheme(page, theme);
      const createButton = page.getByRole('button', { name: /create|launch|start/i }).first();
      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot(`popup-create-coop-${theme}.png`);
    });

    test(`join coop screen – ${theme}`, async () => {
      await setTheme(page, theme);
      const joinButton = page.getByRole('button', { name: /join/i }).first();
      if (await joinButton.isVisible().catch(() => false)) {
        await joinButton.click();
        await page.waitForTimeout(300);
      }
      await expect(page).toHaveScreenshot(`popup-join-coop-${theme}.png`);
    });

    test(`main tabs – ${theme}`, async () => {
      await ensurePopupHasCoop(page);
      await setTheme(page, theme);

      await expect(page).toHaveScreenshot(`popup-main-tabs-home-${theme}.png`);

      await page.getByRole('button', { name: 'Chickens' }).click();
      await page.waitForTimeout(250);
      await expect(page).toHaveScreenshot(`popup-main-tabs-drafts-${theme}.png`);

      await page.getByRole('button', { name: /Feed/ }).click();
      await page.waitForTimeout(250);
      await expect(page).toHaveScreenshot(`popup-main-tabs-feed-${theme}.png`);
    });
  }
});
