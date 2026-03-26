const STANDARD_HOST_ORIGINS = ['http://*/*', 'https://*/*'] as const;

function isStandardWebUrl(url?: string): url is string {
  return Boolean(url?.startsWith('http://') || url?.startsWith('https://'));
}

async function queryActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  } catch {
    return null;
  }
}

async function ensureStandardHostAccess() {
  if (!chrome.permissions?.contains || !chrome.permissions?.request) {
    return { ok: true } as const;
  }

  const hasAccess = await chrome.permissions.contains({
    origins: [...STANDARD_HOST_ORIGINS],
  });
  if (hasAccess) {
    return { ok: true } as const;
  }

  try {
    const granted = await chrome.permissions.request({
      origins: [...STANDARD_HOST_ORIGINS],
    });
    return granted
      ? ({ ok: true } as const)
      : ({
          ok: false,
          error: 'Coop needs webpage access to round up and capture standard sites.',
        } as const);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not request webpage access.',
    } as const;
  }
}

export async function preflightManualCapture() {
  let tabs: chrome.tabs.Tab[] = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not inspect open tabs.',
    } as const;
  }

  const supportedTabs = tabs.filter((tab) => isStandardWebUrl(tab.url));
  if (supportedTabs.length === 0) {
    return {
      ok: false,
      error: 'Open at least one standard web page before rounding up tabs.',
    } as const;
  }

  return ensureStandardHostAccess();
}

export async function preflightActiveTabCapture() {
  const tab = await queryActiveTab();
  if (!tab || !isStandardWebUrl(tab.url)) {
    return {
      ok: false,
      error: 'Open a standard web page before capturing this tab.',
    } as const;
  }

  const access = await ensureStandardHostAccess();
  return access.ok
    ? ({ ok: true, tab } as const)
    : ({ ok: false, error: access.error } as const);
}

export async function preflightScreenshotCapture() {
  const tab = await queryActiveTab();
  if (!tab || !isStandardWebUrl(tab.url)) {
    return {
      ok: false,
      error: 'Open a standard web page before taking a screenshot.',
    } as const;
  }

  if (tab.windowId == null) {
    return {
      ok: false,
      error: 'Could not identify the current browser window.',
    } as const;
  }

  return { ok: true, tab } as const;
}

export { isStandardWebUrl, STANDARD_HOST_ORIGINS };
