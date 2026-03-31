import type { ActionBundle, CoopSharedState } from '@coop/shared';
import { useMemo } from 'react';
import type { RuntimeSummary, SidepanelIntentSegment } from '../../../runtime/messages';
import { PopupSubheader, type PopupSubheaderTag } from '../../Popup/PopupSubheader';
import { SidepanelSubheader } from '../SidepanelSubheader';
import {
  GreenGoodsAccessSummary,
  GreenGoodsProvisionButton,
  GreenGoodsWorkSubmissionForm,
} from '../cards/GreenGoodsActionCards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isGardenerActionBundle(bundle: ActionBundle) {
  return (
    bundle.actionClass === 'green-goods-add-gardener' ||
    bundle.actionClass === 'green-goods-remove-gardener'
  );
}

function readBundleTargetMemberId(bundle: ActionBundle) {
  const targetMemberId = bundle.payload.memberId;
  return typeof targetMemberId === 'string' && targetMemberId.length > 0
    ? targetMemberId
    : undefined;
}

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
  onProvisionMemberOnchainAccount: () => Promise<void>;
  onSubmitGreenGoodsWorkSubmission: (input: {
    actionUid: number;
    title: string;
    feedback: string;
    metadataCid: string;
    mediaCids: string[];
  }) => Promise<void>;
  onOpenSynthesisSegment: (segment: Extract<SidepanelIntentSegment, 'review'>) => void;
}

export function RoostTab({
  activeCoop,
  activeMember,
  allCoops,
  selectActiveCoop,
  greenGoodsActionQueue,
  summary,
  onProvisionMemberOnchainAccount,
  onSubmitGreenGoodsWorkSubmission,
  onOpenSynthesisSegment,
}: RoostTabProps) {
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

  const memberCount = activeCoop?.members.length ?? 0;

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
      </SidepanelSubheader>

      {/* --- Synthesis at-a-glance --- */}
      <article className="panel-card roost-hero-card">
        <div className="roost-hero-card__header">
          <h2>Your Workspace</h2>
          {activeCoop ? (
            <span className="meta-text">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        <div className="roost-summary-strip">
          <div className="roost-stat-cell">
            <strong className="roost-stat-cell__value">{summary?.routedTabs ?? 0}</strong>
            <span className="roost-stat-cell__label">Signals</span>
          </div>
          <div className="roost-stat-cell">
            <strong className="roost-stat-cell__value">{summary?.pendingDrafts ?? 0}</strong>
            <span className="roost-stat-cell__label">Drafts</span>
          </div>
          <div className="roost-stat-cell">
            <strong className="roost-stat-cell__value">
              {summary?.staleObservationCount ?? 0}
            </strong>
            <span className="roost-stat-cell__label">Stale</span>
          </div>
        </div>
        <button
          className="primary-button"
          onClick={() => onOpenSynthesisSegment('review')}
          type="button"
        >
          Review Chickens
        </button>
      </article>

      {/* --- Recent coop activity --- */}
      {recentArtifacts.length > 0 ? (
        <article className="panel-card">
          <h2>Recent Activity</h2>
          <div className="roost-activity-list">
            {recentArtifacts.map((artifact) => (
              <div className="roost-activity-item" key={artifact.id}>
                <span className="roost-activity-item__title">{artifact.title}</span>
                <span className="roost-activity-item__meta">
                  {artifact.category} &middot;{' '}
                  {new Date(artifact.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {/* --- Green Goods section --- */}
      {activeCoop?.greenGoods ? (
        <article className="panel-card">
          <h2>Green Goods</h2>
          {!activeCoop.greenGoods.enabled ? (
            <p className="helper-text">
              Green Goods is not enabled for this coop yet. Provisioning a member garden account is
              only useful once the coop requests a garden.
            </p>
          ) : !activeMember ? (
            <p className="helper-text">
              Open this coop as the member who should own the garden account before provisioning or
              submitting impact.
            </p>
          ) : (
            <>
              <GreenGoodsAccessSummary
                activeCoop={activeCoop}
                memberAccount={memberAccount}
                memberBinding={memberBinding}
                memberGardenerBundles={memberGardenerBundles}
              />
              <GreenGoodsProvisionButton
                memberAccount={memberAccount}
                gardenAddress={activeCoop.greenGoods.gardenAddress}
                canSubmit={canSubmitMemberGreenGoodsActions}
                onProvision={onProvisionMemberOnchainAccount}
              />
            </>
          )}
        </article>
      ) : null}

      {canSubmitMemberGreenGoodsActions ? (
        <article className="panel-card">
          <h2>Submit Work</h2>
          <GreenGoodsWorkSubmissionForm onSubmit={onSubmitGreenGoodsWorkSubmission} />
          <p className="helper-text">
            Impact certificates are packaged later from approved work through operator Hypercert
            flows.
          </p>
        </article>
      ) : null}

      {/* --- Capital & Payouts stub --- */}
      <article className="panel-card roost-stub-card">
        <h2>Capital &amp; Payouts</h2>
        <p className="helper-text">Allocation proposals and payout claims.</p>
        <span className="badge">Coming soon</span>
      </article>
    </section>
  );
}
