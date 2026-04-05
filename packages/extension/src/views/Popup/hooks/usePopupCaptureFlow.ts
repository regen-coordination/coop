import { useCallback, useEffect, useState } from 'react';
import type { useCaptureActions } from '../../shared/useCaptureActions';
import type { PopupPendingCapture } from '../popup-types';

export interface PopupCaptureFlowDeps {
  captureActions: ReturnType<typeof useCaptureActions>;
  setMessage: (message: string) => void;
}

export function usePopupCaptureFlow(deps: PopupCaptureFlowDeps) {
  const { captureActions } = deps;
  const [pendingCapture, setPendingCapture] = useState<PopupPendingCapture | null>(null);

  const replacePendingCapture = useCallback((nextCapture: PopupPendingCapture | null) => {
    setPendingCapture((current) => {
      if (current?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return nextCapture;
    });
  }, []);

  const handleUpdatePendingCapture = useCallback((patch: Partial<PopupPendingCapture>) => {
    setPendingCapture((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const handleDismissPendingCapture = useCallback(() => {
    replacePendingCapture(null);
  }, [replacePendingCapture]);

  const handlePrepareScreenshot = useCallback(async () => {
    const preparedCapture = await captureActions.prepareVisibleScreenshot();
    if (preparedCapture) {
      replacePendingCapture(preparedCapture);
    }
  }, [captureActions, replacePendingCapture]);

  const handlePrepareFileCapture = useCallback(
    async (file: File) => {
      const preparedCapture = await captureActions.prepareFileCapture(file);
      if (preparedCapture) {
        replacePendingCapture(preparedCapture);
      }
    },
    [captureActions, replacePendingCapture],
  );

  const handleSavePendingCapture = useCallback(async () => {
    if (!pendingCapture) {
      return;
    }

    const saved = await captureActions.savePendingCapture(pendingCapture);
    if (saved) {
      replacePendingCapture(null);
    }
  }, [captureActions, pendingCapture, replacePendingCapture]);

  useEffect(() => {
    return () => {
      if (pendingCapture?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingCapture.previewUrl);
      }
    };
  }, [pendingCapture]);

  return {
    pendingCapture,
    replacePendingCapture,
    handleUpdatePendingCapture,
    handleDismissPendingCapture,
    handlePrepareScreenshot,
    handlePrepareFileCapture,
    handleSavePendingCapture,
  };
}
