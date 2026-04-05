import type { ActionBundle, CoopSharedState } from '@coop/shared';
import {
  GreenGoodsAccessSummary,
  GreenGoodsProvisionButton,
  GreenGoodsWorkSubmissionForm,
} from '../cards/GreenGoodsActionCards';
import type { RoostTabProps } from './RoostTab';
import { GARDEN_STAGE_COPY, type GardenStage } from './roost-helpers';

// ---------------------------------------------------------------------------
// GardenSection
// ---------------------------------------------------------------------------

export interface GardenSectionProps {
  activeCoop: CoopSharedState | undefined;
  activeMember: CoopSharedState['members'][number] | undefined;
  gardenStage: GardenStage;
  memberAccount: CoopSharedState['memberAccounts'][number] | undefined;
  memberBinding: { status: string; actorAddress?: string; lastSyncedAt?: string } | undefined;
  memberGardenerBundles: ActionBundle[];
  canSubmitMemberGreenGoodsActions: boolean;
  onProvisionMemberOnchainAccount: () => Promise<void>;
  onSubmitGreenGoodsWorkSubmission: RoostTabProps['onSubmitGreenGoodsWorkSubmission'];
}

export function GardenSection({
  activeCoop,
  activeMember,
  gardenStage,
  memberAccount,
  memberBinding,
  memberGardenerBundles,
  canSubmitMemberGreenGoodsActions,
  onProvisionMemberOnchainAccount,
  onSubmitGreenGoodsWorkSubmission,
}: GardenSectionProps) {
  const stageCopy = GARDEN_STAGE_COPY[gardenStage];

  return (
    <>
      {/* --- Onboarding / status card --- */}
      {gardenStage !== 'ready' ? (
        <article className="panel-card roost-hero-card">
          <h2>{stageCopy.title}</h2>
          <p className="helper-text">{stageCopy.description}</p>
          {gardenStage === 'needs-account' ? (
            <button
              className="primary-button"
              onClick={() => void onProvisionMemberOnchainAccount()}
              type="button"
            >
              Provision my garden account
            </button>
          ) : null}
          {stageCopy.action ? <span className="badge">{stageCopy.action}</span> : null}
        </article>
      ) : null}

      {/* --- Full garden workspace (ready state) --- */}
      {gardenStage === 'ready' && activeCoop && activeMember ? (
        <>
          <article className="panel-card">
            <h2>Green Goods</h2>
            <GreenGoodsAccessSummary
              activeCoop={activeCoop}
              memberAccount={memberAccount}
              memberBinding={memberBinding}
              memberGardenerBundles={memberGardenerBundles}
            />
            <GreenGoodsProvisionButton
              memberAccount={memberAccount}
              gardenAddress={activeCoop.greenGoods?.gardenAddress}
              canSubmit={canSubmitMemberGreenGoodsActions}
              onProvision={onProvisionMemberOnchainAccount}
            />
          </article>

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
        </>
      ) : null}

      {/* --- No member context --- */}
      {gardenStage === 'ready' && !activeMember ? (
        <article className="panel-card">
          <h2>Garden</h2>
          <p className="helper-text">
            Open this coop as the member who should own the garden account before provisioning or
            submitting impact.
          </p>
        </article>
      ) : null}

      {/* --- Capital & Payouts stub --- */}
      <article className="panel-card roost-stub-card">
        <h2>Capital &amp; Payouts</h2>
        <p className="helper-text">Allocation proposals and payout claims.</p>
        <span className="badge">Coming soon</span>
      </article>
    </>
  );
}
