import type { ActionBundle, CoopSharedState } from '@coop/shared';
import { useMemo, useState } from 'react';
import type {
  AgentDashboardResponse,
  RuntimeSummary,
  SidepanelIntentSegment,
} from '../../../runtime/messages';
import { PopupSubheader, type PopupSubheaderTag } from '../../Popup/PopupSubheader';
import { SidepanelSubheader } from '../SidepanelSubheader';
import { AgentSection } from './RoostAgentSection';
import { FocusSection } from './RoostFocusSection';
import { GardenSection } from './RoostGardenSection';
import { isGardenerActionBundle, readBundleTargetMemberId } from './roost-helpers';

// ---------------------------------------------------------------------------
// Sub-tab type
// ---------------------------------------------------------------------------

export type RoostSubTab = 'focus' | 'agent' | 'garden';

// ---------------------------------------------------------------------------
// RoostTab
// ---------------------------------------------------------------------------

export interface RoostTabProps {
  activeCoop: CoopSharedState | undefined;
  activeMember: CoopSharedState['members'][number] | undefined;
  allCoops: CoopSharedState[];
  selectActiveCoop: (coopId: string) => void;
  greenGoodsActionQueue: ActionBundle[];
  summary: RuntimeSummary | null;
  agentDashboard: AgentDashboardResponse | null;
  agentRunning?: boolean;
  onProvisionMemberOnchainAccount: () => Promise<void>;
  onSubmitGreenGoodsWorkSubmission: (input: {
    actionUid: number;
    title: string;
    feedback: string;
    metadataCid: string;
    mediaCids: string[];
  }) => Promise<void>;
  onRunAgentCycle: () => Promise<void>;
  onApproveAgentPlan: (planId: string) => Promise<void>;
  onRejectAgentPlan: (planId: string, reason?: string) => Promise<void>;
  onOpenSynthesisSegment: (segment: Extract<SidepanelIntentSegment, 'review'>) => void;
}

export function RoostTab({
  activeCoop,
  activeMember,
  allCoops,
  selectActiveCoop,
  greenGoodsActionQueue,
  summary,
  agentDashboard,
  onProvisionMemberOnchainAccount,
  onSubmitGreenGoodsWorkSubmission,
  agentRunning,
  onRunAgentCycle,
  onApproveAgentPlan,
  onRejectAgentPlan,
  onOpenSynthesisSegment,
}: RoostTabProps) {
  // ---------------------------------------------------------------------------
  // Sub-tab state
  // ---------------------------------------------------------------------------

  const [roostSubTab, setRoostSubTab] = useState<RoostSubTab>('focus');

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const memberAccount =
    activeCoop && activeMember
      ? activeCoop.memberAccounts.find((account) => account.memberId === activeMember.id)
      : undefined;

  const memberBinding =
    activeCoop?.greenGoods?.memberBindings.find(
      (binding) => binding.memberId === activeMember?.id,
    ) ?? undefined;

  const canSubmitMemberGreenGoodsActions = Boolean(
    activeCoop?.greenGoods?.gardenAddress &&
      activeMember &&
      memberAccount?.accountAddress &&
      (memberAccount.status === 'predicted' || memberAccount.status === 'active'),
  );

  const memberGardenerBundles = activeMember
    ? greenGoodsActionQueue.filter(
        (bundle) =>
          isGardenerActionBundle(bundle) && readBundleTargetMemberId(bundle) === activeMember.id,
      )
    : [];

  // ---------------------------------------------------------------------------
  // Derived: recent coop activity
  // ---------------------------------------------------------------------------

  const recentArtifacts = useMemo(() => {
    if (!activeCoop) return [];
    return [...activeCoop.artifacts]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
  }, [activeCoop]);

  // ---------------------------------------------------------------------------
  // Derived: agent state
  // ---------------------------------------------------------------------------

  const pendingPlans = useMemo(
    () =>
      agentDashboard?.plans.filter((p) => p.requiresApproval && !p.approvedAt && !p.rejectedAt) ??
      [],
    [agentDashboard],
  );

  const recentObservations = useMemo(
    () => agentDashboard?.observations.slice(0, 5) ?? [],
    [agentDashboard],
  );

  const recentMemories = useMemo(
    () => agentDashboard?.memories.slice(0, 3) ?? [],
    [agentDashboard],
  );

  const lastCompletedRun = useMemo(() => {
    const runs = agentDashboard?.skillRuns ?? [];
    return runs.find((r) => r.completedAt) ?? null;
  }, [agentDashboard]);

  // ---------------------------------------------------------------------------
  // Badge counts
  // ---------------------------------------------------------------------------

  const focusBadge = (summary?.pendingDrafts ?? 0) + (summary?.staleObservationCount ?? 0);
  const agentBadge = pendingPlans.length;
  const gardenBadge = memberGardenerBundles.length;

  // ---------------------------------------------------------------------------
  // Derived: garden onboarding stage
  // ---------------------------------------------------------------------------

  const gardenStage = useMemo(():
    | 'no-greengoods'
    | 'disabled'
    | 'requested'
    | 'provisioning'
    | 'needs-account'
    | 'pending-sync'
    | 'ready'
    | 'error' => {
    if (!activeCoop?.greenGoods) return 'no-greengoods';
    const gg = activeCoop.greenGoods;
    if (!gg.enabled) return 'disabled';
    const status = (gg as { status?: string }).status;
    if (status === 'error') return 'error';
    if (status === 'requested') return 'requested';
    if (status === 'provisioning') return 'provisioning';
    // Garden is linked — check member state
    if (!memberAccount?.accountAddress) return 'needs-account';
    if (memberBinding?.status === 'pending-sync') return 'pending-sync';
    if (memberBinding?.status === 'error') return 'error';
    return 'ready';
  }, [activeCoop, memberAccount, memberBinding]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="stack">
      <SidepanelSubheader>
        <PopupSubheader
          ariaLabel="Filter by coop"
          tags={allCoops.map(
            (c): PopupSubheaderTag => ({
              id: c.profile.id,
              label: c.profile.name,
              active: c.profile.id === (activeCoop?.profile.id ?? allCoops[0]?.profile.id),
              onClick: () => selectActiveCoop(c.profile.id),
            }),
          )}
        />
        <nav className="nest-sub-tabs" aria-label="Roost sections">
          <button
            className={roostSubTab === 'focus' ? 'is-active' : ''}
            onClick={() => setRoostSubTab('focus')}
            type="button"
          >
            Focus
            {focusBadge > 0 ? (
              <span className="nest-badge">{focusBadge > 99 ? '99+' : focusBadge}</span>
            ) : null}
          </button>
          <button
            className={roostSubTab === 'agent' ? 'is-active' : ''}
            onClick={() => setRoostSubTab('agent')}
            type="button"
          >
            Agent
            {agentBadge > 0 ? (
              <span className="nest-badge">{agentBadge > 99 ? '99+' : agentBadge}</span>
            ) : null}
          </button>
          <button
            className={roostSubTab === 'garden' ? 'is-active' : ''}
            onClick={() => setRoostSubTab('garden')}
            type="button"
          >
            Garden
            {gardenBadge > 0 ? (
              <span className="nest-badge">{gardenBadge > 99 ? '99+' : gardenBadge}</span>
            ) : null}
          </button>
        </nav>
      </SidepanelSubheader>

      {/* ================================================================= */}
      {/* Focus sub-tab                                                     */}
      {/* ================================================================= */}
      {roostSubTab === 'focus' ? (
        <FocusSection
          summary={summary}
          pendingPlans={pendingPlans}
          recentArtifacts={recentArtifacts}
          agentRunning={agentRunning}
          onOpenSynthesisSegment={onOpenSynthesisSegment}
          onRunAgentCycle={onRunAgentCycle}
        />
      ) : null}

      {/* ================================================================= */}
      {/* Agent sub-tab                                                     */}
      {/* ================================================================= */}
      {roostSubTab === 'agent' ? (
        <AgentSection
          summary={summary}
          lastCompletedRun={lastCompletedRun}
          pendingPlans={pendingPlans}
          recentObservations={recentObservations}
          recentMemories={recentMemories}
          agentRunning={agentRunning}
          onRunAgentCycle={onRunAgentCycle}
          onApproveAgentPlan={onApproveAgentPlan}
          onRejectAgentPlan={onRejectAgentPlan}
        />
      ) : null}

      {/* ================================================================= */}
      {/* Garden sub-tab                                                    */}
      {/* ================================================================= */}
      {roostSubTab === 'garden' ? (
        <GardenSection
          activeCoop={activeCoop}
          activeMember={activeMember}
          gardenStage={gardenStage}
          memberAccount={memberAccount}
          memberBinding={memberBinding}
          memberGardenerBundles={memberGardenerBundles}
          canSubmitMemberGreenGoodsActions={canSubmitMemberGreenGoodsActions}
          onProvisionMemberOnchainAccount={onProvisionMemberOnchainAccount}
          onSubmitGreenGoodsWorkSubmission={onSubmitGreenGoodsWorkSubmission}
        />
      ) : null}
    </section>
  );
}
