import type { GreenGoodsAssessmentRequest, GreenGoodsWorkApprovalRequest } from '@coop/shared';
import { sendRuntimeMessage } from '../../../runtime/messages';
import type { useDashboard } from './useDashboard';

export interface SidepanelGreenGoodsDeps {
  activeCoop: ReturnType<typeof useDashboard>['activeCoop'];
  activeMember: ReturnType<typeof useDashboard>['activeMember'];
  setMessage: (msg: string) => void;
  loadDashboard: ReturnType<typeof useDashboard>['loadDashboard'];
  loadAgentDashboard: () => Promise<void>;
}

export function useSidepanelGreenGoods(deps: SidepanelGreenGoodsDeps) {
  const { activeCoop, activeMember, setMessage, loadDashboard, loadAgentDashboard } = deps;

  async function handleSubmitGreenGoodsImpactReport(input: {
    title: string;
    description: string;
    domain: 'solar' | 'agro' | 'edu' | 'waste';
    reportCid: string;
    metricsSummary: string;
    reportingPeriodStart: number;
    reportingPeriodEnd: number;
  }) {
    if (!activeCoop || !activeMember) {
      setMessage('Open the coop as the member who should submit this report first.');
      return;
    }

    const response = await sendRuntimeMessage({
      type: 'submit-green-goods-impact-report',
      payload: {
        coopId: activeCoop.profile.id,
        memberId: activeMember.id,
        report: input,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not submit the Green Goods impact report.');
      return;
    }
    setMessage('Green Goods impact report submitted from your member smart account.');
    await loadDashboard();
  }

  async function handleSubmitGreenGoodsWorkSubmission(input: {
    actionUid: number;
    title: string;
    feedback: string;
    metadataCid: string;
    mediaCids: string[];
  }) {
    if (!activeCoop || !activeMember) {
      setMessage('Open the coop as the member who should submit this work first.');
      return;
    }

    const response = await sendRuntimeMessage({
      type: 'submit-green-goods-work-submission',
      payload: {
        coopId: activeCoop.profile.id,
        memberId: activeMember.id,
        submission: input,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not submit the Green Goods work submission.');
      return;
    }
    setMessage('Green Goods work submission submitted from your member smart account.');
    await loadDashboard();
  }

  async function handleQueueGreenGoodsWorkApproval(
    coopId: string,
    request: GreenGoodsWorkApprovalRequest,
  ) {
    const response = await sendRuntimeMessage({
      type: 'queue-green-goods-work-approval',
      payload: { coopId, request },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not queue the Green Goods work approval.');
      return;
    }
    setMessage('Green Goods work approval queued.');
    await loadAgentDashboard();
    await loadDashboard();
  }

  async function handleQueueGreenGoodsAssessment(
    coopId: string,
    request: GreenGoodsAssessmentRequest,
  ) {
    const response = await sendRuntimeMessage({
      type: 'queue-green-goods-assessment',
      payload: { coopId, request },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not queue the Green Goods assessment.');
      return;
    }
    setMessage('Green Goods assessment queued.');
    await loadAgentDashboard();
    await loadDashboard();
  }

  async function handleQueueGreenGoodsGapAdminSync(coopId: string) {
    const response = await sendRuntimeMessage({
      type: 'queue-green-goods-gap-admin-sync',
      payload: { coopId },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not queue Green Goods GAP admin sync.');
      return;
    }
    setMessage('Green Goods GAP admin sync queued.');
    await loadAgentDashboard();
    await loadDashboard();
  }

  async function handleQueueGreenGoodsMemberSync(coopId: string) {
    const response = await sendRuntimeMessage<{
      proposed: number;
      skippedMemberIds: string[];
    }>({
      type: 'queue-green-goods-member-sync',
      payload: { coopId },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not queue gardener sync.');
      return;
    }

    const proposed = response.data?.proposed ?? 0;
    const skipped = response.data?.skippedMemberIds.length ?? 0;
    setMessage(
      proposed > 0
        ? `Queued ${proposed} gardener sync action${proposed === 1 ? '' : 's'}${
            skipped > 0
              ? ` and skipped ${skipped} member${skipped === 1 ? '' : 's'} waiting on provisioning.`
              : '.'
          }`
        : skipped > 0
          ? `No gardener actions were needed. ${skipped} member${skipped === 1 ? '' : 's'} still need a local account.`
          : 'Garden member bindings are already in sync.',
    );
    await loadDashboard();
  }

  return {
    handleSubmitGreenGoodsImpactReport,
    handleSubmitGreenGoodsWorkSubmission,
    handleQueueGreenGoodsWorkApproval,
    handleQueueGreenGoodsAssessment,
    handleQueueGreenGoodsGapAdminSync,
    handleQueueGreenGoodsMemberSync,
  };
}
