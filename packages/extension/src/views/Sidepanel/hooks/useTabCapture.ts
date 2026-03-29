import type { CaptureExclusionCategory, ReceiverCapture, UiPreferences } from '@coop/shared';
import { sendRuntimeMessage } from '../../../runtime/messages';
import {
  preflightActiveTabCapture,
  preflightManualCapture,
  preflightScreenshotCapture,
} from '../../shared/capture-preflight';
import type { SidepanelTab } from '../sidepanel-tabs';

export function useTabCapture(deps: {
  setMessage: (msg: string) => void;
  setPanelTab: (tab: SidepanelTab) => void;
  loadDashboard: () => Promise<void>;
}) {
  const { setMessage, setPanelTab, loadDashboard } = deps;

  async function runManualCapture() {
    const preflight = await preflightManualCapture();
    if (!preflight.ok) {
      setMessage(preflight.error);
      return;
    }

    try {
      const response = await sendRuntimeMessage<number>({ type: 'manual-capture' });
      if (!response.ok) {
        setMessage(response.error ?? 'Round-up failed.');
        return;
      }

      if ((response.data ?? 0) > 0) {
        setMessage(`Round-up complete. Coop checked ${response.data ?? 0} tabs locally.`);
        setPanelTab('chickens');
      } else {
        setMessage('No eligible tabs were captured.');
      }
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Round-up failed.');
    }
  }

  async function runActiveTabCapture() {
    const preflight = await preflightActiveTabCapture();
    if (!preflight.ok) {
      setMessage(preflight.error);
      return;
    }

    try {
      const response = await sendRuntimeMessage<number>({ type: 'capture-active-tab' });
      if (!response.ok) {
        setMessage(response.error ?? 'This-tab round-up failed.');
        return;
      }

      if ((response.data ?? 0) > 0) {
        setMessage(`This tab was rounded up locally. Coop checked ${response.data ?? 0} tab.`);
        setPanelTab('chickens');
      } else {
        setMessage('This tab did not produce a new capture.');
      }
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'This-tab round-up failed.');
    }
  }

  async function captureVisibleScreenshotAction() {
    const preflight = await preflightScreenshotCapture();
    if (!preflight.ok) {
      setMessage(preflight.error);
      return;
    }

    try {
      const response = await sendRuntimeMessage<ReceiverCapture>({
        type: 'capture-visible-screenshot',
      });
      setMessage(
        response.ok
          ? 'This page was snapped into Pocket Coop finds.'
          : (response.error ?? 'Screenshot capture failed.'),
      );
      if (response.ok) {
        setPanelTab('nest');
        await loadDashboard();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Screenshot capture failed.');
    }
  }

  async function updateAgentCadence(agentCadenceMinutes: UiPreferences['agentCadenceMinutes']) {
    const currentPreferences = await sendRuntimeMessage<UiPreferences>({
      type: 'get-ui-preferences',
    });
    if (!currentPreferences.ok || !currentPreferences.data) {
      setMessage(currentPreferences.error ?? 'Could not load settings.');
      return;
    }
    const response = await sendRuntimeMessage<UiPreferences>({
      type: 'set-ui-preferences',
      payload: {
        ...currentPreferences.data,
        agentCadenceMinutes,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update agent cadence.');
      return;
    }
    setMessage(`Agent cadence updated to ${formatAgentCadence(agentCadenceMinutes)}.`);
    await loadDashboard();
  }

  async function updateExcludedCategories(excludedCategories: CaptureExclusionCategory[]) {
    const currentPreferences = await sendRuntimeMessage<UiPreferences>({
      type: 'get-ui-preferences',
    });
    if (!currentPreferences.ok || !currentPreferences.data) {
      setMessage(currentPreferences.error ?? 'Could not load settings.');
      return;
    }
    const response = await sendRuntimeMessage<UiPreferences>({
      type: 'set-ui-preferences',
      payload: { ...currentPreferences.data, excludedCategories },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update exclusions.');
      return;
    }
    await loadDashboard();
  }

  async function updateCustomExcludedDomains(customExcludedDomains: string[]) {
    const currentPreferences = await sendRuntimeMessage<UiPreferences>({
      type: 'get-ui-preferences',
    });
    if (!currentPreferences.ok || !currentPreferences.data) {
      setMessage(currentPreferences.error ?? 'Could not load settings.');
      return;
    }
    const response = await sendRuntimeMessage<UiPreferences>({
      type: 'set-ui-preferences',
      payload: { ...currentPreferences.data, customExcludedDomains },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update custom domains.');
      return;
    }
    await loadDashboard();
  }

  async function toggleCaptureOnClose(captureOnClose: boolean) {
    const currentPreferences = await sendRuntimeMessage<UiPreferences>({
      type: 'get-ui-preferences',
    });
    if (!currentPreferences.ok || !currentPreferences.data) {
      setMessage(currentPreferences.error ?? 'Could not load settings.');
      return;
    }
    const response = await sendRuntimeMessage<UiPreferences>({
      type: 'set-ui-preferences',
      payload: { ...currentPreferences.data, captureOnClose },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update capture-on-close setting.');
      return;
    }
    setMessage(
      captureOnClose ? 'Closing tabs will now be captured.' : 'Capture on tab close disabled.',
    );
    await loadDashboard();
  }

  return {
    runManualCapture,
    runActiveTabCapture,
    captureVisibleScreenshotAction,
    updateAgentCadence,
    updateExcludedCategories,
    updateCustomExcludedDomains,
    toggleCaptureOnClose,
  };
}

function formatAgentCadence(minutes: UiPreferences['agentCadenceMinutes']) {
  return `${minutes} min`;
}
