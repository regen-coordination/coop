import type { CoopSharedState } from '@coop/shared';
import { useState } from 'react';
import type { DashboardResponse } from '../../../runtime/messages';
import { ArchiveReceiptCard, ArtifactCard, SkeletonCards, SkeletonSummary } from '../cards';
import { CoopCard } from '../cards/CoopCard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CoopsTabProps {
  dashboard: DashboardResponse | null;
  activeCoop: CoopSharedState | undefined;
  allCoops: CoopSharedState[];
  currentMemberId: string | undefined;
  archiveStory: ReturnType<typeof import('@coop/shared').buildCoopArchiveStory> | null;
  archiveReceipts: ReturnType<typeof import('@coop/shared').describeArchiveReceipt>[];
  refreshableArchiveReceipts: CoopSharedState['archiveReceipts'];
  runtimeConfig: DashboardResponse['runtimeConfig'];
  boardUrl: string | undefined;
  archiveSnapshot: () => Promise<void>;
  exportLatestReceipt: (format: 'json' | 'text') => Promise<void>;
  refreshArchiveStatus: (receiptId?: string) => Promise<void>;
  archiveArtifact: (artifactId: string) => Promise<void>;
  toggleArtifactArchiveWorthiness: (artifactId: string, flagged: boolean) => Promise<void>;
  onAnchorOnChain: (receiptId: string) => void;
  onFvmRegister?: (receiptId: string) => void;
  selectActiveCoop: (coopId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoopsTab({
  dashboard,
  activeCoop,
  allCoops,
  currentMemberId,
  archiveStory,
  archiveReceipts,
  refreshableArchiveReceipts,
  runtimeConfig,
  boardUrl,
  archiveSnapshot,
  exportLatestReceipt,
  refreshArchiveStatus,
  archiveArtifact,
  toggleArtifactArchiveWorthiness,
  onAnchorOnChain,
  onFvmRegister,
  selectActiveCoop,
}: CoopsTabProps) {
  const [selectedCoopId, setSelectedCoopId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Level 1 — Coop List
  // ---------------------------------------------------------------------------

  if (!selectedCoopId) {
    return (
      <section className="stack">
        {allCoops.length === 0 ? (
          <div className="empty-state">No coops yet.</div>
        ) : (
          allCoops.map((coop) => (
            <CoopCard
              key={coop.profile.id}
              coop={coop}
              currentMemberId={currentMemberId}
              onClick={() => {
                setSelectedCoopId(coop.profile.id);
                selectActiveCoop(coop.profile.id);
              }}
            />
          ))
        )}
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // Level 2 — Coop Detail (selected coop feed)
  // ---------------------------------------------------------------------------

  return (
    <section className="stack">
      <button className="secondary-button" onClick={() => setSelectedCoopId(null)} type="button">
        &larr; All Coops
      </button>

      <article className="panel-card stub-card">
        <h2>Share something</h2>
        <p className="helper-text">
          Compose and share a note with this coop directly from the feed.
        </p>
        <button className="secondary-button" disabled type="button">
          Compose
        </button>
        <span className="badge" style={{ marginTop: '0.5rem' }}>
          Coming soon
        </span>
      </article>

      <article className="panel-card">
        <h2>Coop Feed</h2>
        <p className="helper-text">
          This is the coop's shared memory, plus the save trail for anything you chose to keep.
        </p>
        {!dashboard ? (
          <SkeletonSummary label="Loading feed" />
        ) : (
          <>
            <div className="summary-strip">
              <div className="summary-card">
                <span>Shared finds</span>
                <strong>{activeCoop?.artifacts.length ?? 0}</strong>
              </div>
              <div className="summary-card">
                <span>Worth saving</span>
                <strong>{archiveStory?.archiveWorthyArtifactCount ?? 0}</strong>
              </div>
              <div className="summary-card">
                <span>Saved proof</span>
                <strong>{activeCoop?.archiveReceipts.length ?? 0}</strong>
              </div>
            </div>
            <div className="action-row">
              {boardUrl ? (
                <a className="primary-button" href={boardUrl} rel="noreferrer" target="_blank">
                  Open Coop Board
                </a>
              ) : null}
              <button className="secondary-button" onClick={archiveSnapshot} type="button">
                Save Coop Snapshot
              </button>
              <button
                className="secondary-button"
                onClick={() => exportLatestReceipt('text')}
                type="button"
              >
                Export Latest Proof
              </button>
            </div>
          </>
        )}
      </article>

      <article className="panel-card">
        <h2>Shared Finds</h2>
        <div className="artifact-grid">
          {activeCoop?.artifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              archiveReceipts={archiveReceipts}
              activeCoop={activeCoop}
              archiveArtifact={archiveArtifact}
              toggleArtifactArchiveWorthiness={toggleArtifactArchiveWorthiness}
            />
          ))}
        </div>
        {activeCoop?.artifacts.length === 0 ? (
          <div className="empty-state">
            No shared finds yet. Share something from the Chickens tab to start the coop feed.
          </div>
        ) : null}
      </article>

      <article className="panel-card">
        <h2>Saved Proof</h2>
        <div className="artifact-grid">
          {archiveReceipts.map((receipt) => (
            <ArchiveReceiptCard
              key={receipt.id}
              receipt={receipt}
              runtimeConfig={runtimeConfig}
              liveArchiveAvailable={dashboard?.operator.liveArchiveAvailable ?? true}
              refreshArchiveStatus={refreshArchiveStatus}
              onAnchorOnChain={onAnchorOnChain}
              onFvmRegister={onFvmRegister}
            />
          ))}
        </div>
        {archiveReceipts.length === 0 ? (
          <div className="empty-state">
            Saved proof appears here after a shared find or snapshot is preserved.
          </div>
        ) : null}
      </article>
    </section>
  );
}
