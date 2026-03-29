import type { PolicyActionClass } from '@coop/shared';
import { sendRuntimeMessage } from '../../../runtime/messages';
import type { useDashboard } from './useDashboard';

export interface SidepanelActionsDeps {
  activeCoop: ReturnType<typeof useDashboard>['activeCoop'];
  activeMember: ReturnType<typeof useDashboard>['activeMember'];
  loadDashboard: ReturnType<typeof useDashboard>['loadDashboard'];
}

export function useSidepanelActions(deps: SidepanelActionsDeps) {
  const { activeCoop, activeMember, loadDashboard } = deps;

  async function handleSetPolicy(actionClass: PolicyActionClass, approvalRequired: boolean) {
    await sendRuntimeMessage({
      type: 'set-action-policy',
      payload: { actionClass, approvalRequired },
    });
    await loadDashboard();
  }

  async function handleProposeAction(
    actionClass: PolicyActionClass,
    payload: Record<string, unknown>,
  ) {
    await sendRuntimeMessage({
      type: 'propose-action',
      payload: {
        actionClass,
        coopId: activeCoop?.profile.id ?? '',
        memberId: activeMember?.id ?? '',
        payload,
      },
    });
    await loadDashboard();
  }

  async function handleApproveAction(bundleId: string) {
    await sendRuntimeMessage({ type: 'approve-action', payload: { bundleId } });
    await loadDashboard();
  }

  async function handleRejectAction(bundleId: string) {
    await sendRuntimeMessage({ type: 'reject-action', payload: { bundleId } });
    await loadDashboard();
  }

  async function handleExecuteAction(bundleId: string) {
    await sendRuntimeMessage({ type: 'execute-action', payload: { bundleId } });
    await loadDashboard();
  }

  return {
    handleSetPolicy,
    handleProposeAction,
    handleApproveAction,
    handleRejectAction,
    handleExecuteAction,
  };
}
