import { type UiPreferences, defaultSoundPreferences } from '@coop/shared';
import { useMemo } from 'react';
import { playRandomChickenSound } from '../../../runtime/audio';
import type { DashboardResponse } from '../../../runtime/messages';
import { sendRuntimeMessage } from '../../../runtime/messages';
import { accountSummary } from '../helpers';
import type { usePopupDashboard } from './usePopupDashboard';

export interface PopupProfileDeps {
  dashboard: DashboardResponse | null;
  coops: ReturnType<typeof usePopupDashboard>['coops'];
  loadDashboard: () => Promise<void>;
  setMessage: (message: string) => void;
}

export function usePopupProfile(deps: PopupProfileDeps) {
  const { dashboard, coops, loadDashboard, setMessage } = deps;

  async function updateUiPreferences(patch: Partial<UiPreferences>) {
    if (!dashboard) {
      return;
    }

    const response = await sendRuntimeMessage<UiPreferences>({
      type: 'set-ui-preferences',
      payload: {
        ...dashboard.uiPreferences,
        ...patch,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update preferences.');
      return;
    }
    await loadDashboard();
    setMessage('Preferences updated.');
  }

  async function updateSound(enabled: boolean) {
    if (!dashboard) {
      return;
    }

    const response = await sendRuntimeMessage({
      type: 'set-sound-preferences',
      payload: {
        ...dashboard.soundPreferences,
        enabled,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update sound settings.');
      return;
    }
    await loadDashboard();
    setMessage(enabled ? 'Sound is on.' : 'Sound is off.');
  }

  function playBrandSound() {
    void playRandomChickenSound(dashboard?.soundPreferences ?? defaultSoundPreferences);
  }

  const accountLabel = accountSummary(dashboard?.authSession?.primaryAddress);

  const profileCoops = useMemo(
    () =>
      coops.map((coop) => ({
        name: coop.profile.name,
      })),
    [coops],
  );

  return {
    updateUiPreferences,
    updateSound,
    playBrandSound,
    accountLabel,
    profileCoops,
  };
}
