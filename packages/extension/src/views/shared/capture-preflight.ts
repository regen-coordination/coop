const STANDARD_HOST_ORIGINS = ['http://*/*', 'https://*/*'] as const;

function isStandardWebUrl(url?: string): url is string {
  return Boolean(url?.startsWith('http://') || url?.startsWith('https://'));
}

function toOriginPattern(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/*`;
  } catch {
    return null;
  }
}

async function queryActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  } catch {
    return null;
  }
}

/**
 * Check whether broad host permissions are already granted.
 * This never triggers a permission dialog — safe to call from the popup.
 */
async function hasBroadHostAccess(): Promise<boolean> {
  try {
    if (!chrome.permissions?.contains) return true;
    return await chrome.permissions.contains({
      origins: [...STANDARD_HOST_ORIGINS],
    });
  } catch {
    return false;
  }
}

/**
 * Request broad host permissions. This opens a native dialog that will
 * close the popup in Chromium (known bug). Only call from the sidepanel
 * or a dedicated tab context when possible.
 */
export async function requestBroadHostAccess(): Promise<boolean> {
  try {
    if (!chrome.permissions?.request) return true;
    return await chrome.permissions.request({
      origins: [...STANDARD_HOST_ORIGINS],
    });
  } catch {
    return false;
  }
}

export async function preflightManualCapture() {
  let tabs: chrome.tabs.Tab[] = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch (error) {
    return {
      ok: false,
      needsPermission: false,
      error: error instanceof Error ? error.message : 'Could not inspect open tabs.',
    } as const;
  }

  const supportedTabs = tabs.filter((tab) => isStandardWebUrl(tab.url));
  if (supportedTabs.length === 0) {
    return {
      ok: false,
      needsPermission: false,
      error: 'Open at least one standard web page before rounding up tabs.',
    } as const;
  }

  // Only CHECK permissions — never request from here. Requesting opens a
  // native dialog that kills the popup in Chromium (crbug.com/40721470).
  // The caller decides how to handle missing permissions.
  const hasAccess = await hasBroadHostAccess();
  if (!hasAccess) {
    return {
      ok: false,
      needsPermission: true,
      error:
        'Coop needs site access to inspect and round up your tabs. Captures stay local until you share them.',
    } as const;
  }

  return { ok: true, needsPermission: false } as const;
}

export async function preflightActiveTabCapture() {
  const tab = await queryActiveTab();
  if (!tab || !isStandardWebUrl(tab.url)) {
    return {
      ok: false,
      error: 'Open a standard web page before capturing this tab.',
    } as const;
  }

  // Active-tab capture is user initiated from the popup/command surface and can
  // rely on the temporary activeTab grant. Reserve the broader host-permission
  // prompt for roundup flows that inspect arbitrary tabs.
  return { ok: true, tab } as const;
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

export async function getActiveTabCaptureAccessStatus() {
  const tab = await queryActiveTab();
  if (!tab || !isStandardWebUrl(tab.url)) {
    return {
      label: 'Open page',
      detail: 'Open a standard web page to capture this tab or request roundup access.',
      tone: 'warning' as const,
    };
  }

  const origin = toOriginPattern(tab.url);
  if (!origin || !chrome.permissions?.contains) {
    return {
      label: 'On demand',
      detail: 'Coop checks site access when you start a roundup or capture.',
      tone: 'ok' as const,
    };
  }

  try {
    const hasAccess = await chrome.permissions.contains({ origins: [origin] });
    return hasAccess
      ? ({
          label: 'This site',
          detail:
            'Coop already has site access here, so roundup can inspect this page without another prompt. Captures still stay local until you share them.',
          tone: 'ok' as const,
        } as const)
      : ({
          label: 'On demand',
          detail:
            'Capture this tab still works from the popup. Coop asks for broader roundup access only when needed, and captures stay local until you share them.',
          tone: 'ok' as const,
        } as const);
  } catch {
    return {
      label: 'On demand',
      detail: 'Coop checks site access when you start a roundup or capture.',
      tone: 'ok' as const,
    };
  }
}

export { hasBroadHostAccess, isStandardWebUrl, STANDARD_HOST_ORIGINS, toOriginPattern };
