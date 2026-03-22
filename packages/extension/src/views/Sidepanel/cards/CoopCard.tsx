import type { CoopSharedState } from '@coop/shared';
import { formatCoopSpaceTypeLabel, getCoopChainLabel } from '@coop/shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CoopCardProps {
  coop: CoopSharedState;
  currentMemberId: string | undefined;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStats(coop: CoopSharedState) {
  const sharedFinds = coop.artifacts.filter((a) => a.reviewStatus === 'published').length;
  const archiveReceipts = coop.archiveReceipts.length;
  const pendingDrafts = coop.artifacts.filter((a) => a.reviewStatus === 'draft').length;
  return { sharedFinds, archiveReceipts, pendingDrafts };
}

function resolveRole(coop: CoopSharedState, memberId: string | undefined) {
  if (!memberId) return null;
  const member = coop.members.find((m) => m.id === memberId);
  return member?.role ?? null;
}

function resolveLastActivity(coop: CoopSharedState): string | null {
  const timestamps: string[] = [];

  for (const artifact of coop.artifacts) {
    timestamps.push(artifact.updatedAt ?? artifact.createdAt);
  }
  for (const receipt of coop.archiveReceipts) {
    timestamps.push(receipt.uploadedAt);
  }

  if (timestamps.length === 0) return null;
  timestamps.sort();
  return timestamps[timestamps.length - 1];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoopCard({ coop, currentMemberId, onClick }: CoopCardProps) {
  const { sharedFinds, archiveReceipts, pendingDrafts } = computeStats(coop);
  const role = resolveRole(coop, currentMemberId);
  const lastActivity = resolveLastActivity(coop);

  return (
    <button className="panel-card summary-card coop-card-button" onClick={onClick} type="button">
      <h3>{coop.profile.name}</h3>

      <div className="badge-row">
        <span className="badge">{formatCoopSpaceTypeLabel(coop.profile.spaceType)}</span>
        <span className="badge">{getCoopChainLabel(coop.onchainState.chainKey, 'short')}</span>
        <span className="badge">
          {coop.members.length} {coop.members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      <div className="summary-strip">
        <div className="summary-card">
          <span>Shared finds</span>
          <strong>{sharedFinds}</strong>
        </div>
        <div className="summary-card">
          <span>Saved</span>
          <strong>{archiveReceipts}</strong>
        </div>
        <div className="summary-card">
          <span>Drafts</span>
          <strong>{pendingDrafts}</strong>
        </div>
      </div>

      {role ? <span className="badge">{role}</span> : null}

      {lastActivity ? (
        <span className="helper-text">
          Last activity {new Date(lastActivity).toLocaleDateString()}
        </span>
      ) : null}
    </button>
  );
}
