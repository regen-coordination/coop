export interface BrowserUxCapabilities {
  canScanQr: boolean;
  canShare: boolean;
  canNotify: boolean;
  canSaveFile: boolean;
  canSetBadge: boolean;
}

export function detectBrowserUxCapabilities(scopeInput = globalThis): BrowserUxCapabilities {
  const scope = scopeInput as typeof globalThis & {
    BarcodeDetector?: unknown;
    Notification?: typeof Notification;
    navigator?: Navigator & {
      share?: Navigator['share'];
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    showSaveFilePicker?: unknown;
  };

  return {
    canScanQr: typeof scope.BarcodeDetector !== 'undefined',
    canShare: typeof scope.navigator?.share === 'function',
    canNotify: typeof scope.Notification !== 'undefined',
    canSaveFile: typeof scope.showSaveFilePicker === 'function',
    canSetBadge:
      typeof scope.navigator?.setAppBadge === 'function' ||
      typeof scope.navigator?.clearAppBadge === 'function',
  };
}
