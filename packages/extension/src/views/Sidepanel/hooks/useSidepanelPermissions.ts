import type { DelegatedActionClass, SessionCapableActionClass } from '@coop/shared';
import { sendRuntimeMessage } from '../../../runtime/messages';
import type { useDashboard } from './useDashboard';

export interface SidepanelPermissionsDeps {
  activeCoop: ReturnType<typeof useDashboard>['activeCoop'];
  runtimeConfig: ReturnType<typeof useDashboard>['runtimeConfig'];
  setMessage: (msg: string) => void;
  loadDashboard: ReturnType<typeof useDashboard>['loadDashboard'];
}

export function useSidepanelPermissions(deps: SidepanelPermissionsDeps) {
  const { activeCoop, runtimeConfig, setMessage, loadDashboard } = deps;

  async function handleIssuePermit(input: {
    coopId: string;
    expiresAt: string;
    maxUses: number;
    allowedActions: DelegatedActionClass[];
  }) {
    await sendRuntimeMessage({ type: 'issue-permit', payload: input });
    await loadDashboard();
  }

  async function handleRevokePermit(permitId: string) {
    await sendRuntimeMessage({ type: 'revoke-permit', payload: { permitId } });
    await loadDashboard();
  }

  async function handleIssueSessionCapability(input: {
    coopId: string;
    expiresAt: string;
    maxUses: number;
    allowedActions: SessionCapableActionClass[];
  }) {
    const response = await sendRuntimeMessage({
      type: 'issue-session-capability',
      payload: input,
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not hatch the garden pass.');
      return;
    }
    setMessage(
      runtimeConfig.sessionMode === 'live'
        ? 'Garden pass hatched and enabled for the shared nest.'
        : runtimeConfig.sessionMode === 'mock'
          ? 'Practice garden pass hatched for the Green Goods rehearsal flow.'
          : 'Garden pass hatched locally. Turn garden pass mode on before live use.',
    );
    await loadDashboard();
  }

  async function handleRotateSessionCapability(capabilityId: string) {
    const response = await sendRuntimeMessage({
      type: 'rotate-session-capability',
      payload: { capabilityId },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not refresh the garden pass.');
      return;
    }
    setMessage('Garden pass refreshed.');
    await loadDashboard();
  }

  async function handleRevokeSessionCapability(capabilityId: string) {
    const response = await sendRuntimeMessage({
      type: 'revoke-session-capability',
      payload: { capabilityId },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not turn off the garden pass.');
      return;
    }
    setMessage('Garden pass turned off.');
    await loadDashboard();
  }

  async function handleExecuteWithPermit(
    permitId: string,
    actionClass: DelegatedActionClass,
    actionPayload: Record<string, unknown>,
  ) {
    const replayId =
      typeof crypto.randomUUID === 'function'
        ? `dreplay-${crypto.randomUUID()}`
        : `dreplay-${Date.now()}`;
    await sendRuntimeMessage({
      type: 'execute-with-permit',
      payload: {
        permitId,
        replayId,
        actionClass,
        coopId: activeCoop?.profile.id ?? '',
        actionPayload,
      },
    });
    await loadDashboard();
  }

  return {
    handleIssuePermit,
    handleRevokePermit,
    handleIssueSessionCapability,
    handleRotateSessionCapability,
    handleRevokeSessionCapability,
    handleExecuteWithPermit,
  };
}
