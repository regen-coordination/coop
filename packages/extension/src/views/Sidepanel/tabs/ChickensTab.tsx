import type { ReviewDraft } from '@coop/shared';
import { useState } from 'react';
import type { InferenceBridgeState } from '../../../runtime/inference-bridge';
import type { DashboardResponse } from '../../../runtime/messages';
import { DraftCard, SkeletonCards } from '../cards';
import type { useDraftEditor } from '../hooks/useDraftEditor';
import type { useTabCapture } from '../hooks/useTabCapture';

// ---------------------------------------------------------------------------
// Shared hook return types
// ---------------------------------------------------------------------------

type DraftEditorReturn = ReturnType<typeof useDraftEditor>;
type TabCaptureReturn = ReturnType<typeof useTabCapture>;
type ChickensFilter = 'all' | 'drafts' | 'ready';

// ---------------------------------------------------------------------------
// ChickensTab
// ---------------------------------------------------------------------------

export interface ChickensTabProps {
  dashboard: DashboardResponse | null;
  visibleDrafts: ReviewDraft[];
  draftEditor: DraftEditorReturn;
  inferenceState: InferenceBridgeState | null;
  runtimeConfig: DashboardResponse['runtimeConfig'];
  tabCapture: TabCaptureReturn;
}

export function ChickensTab({
  dashboard,
  visibleDrafts,
  draftEditor,
  inferenceState,
  runtimeConfig,
  tabCapture,
}: ChickensTabProps) {
  const [filter, setFilter] = useState<ChickensFilter>('all');

  const candidateDrafts = visibleDrafts.filter(
    (d) => d.status === 'candidate' || d.status === 'hatching',
  );
  const readyDrafts = visibleDrafts.filter((d) => d.status === 'ready');

  const filteredDrafts =
    filter === 'drafts' ? candidateDrafts : filter === 'ready' ? readyDrafts : visibleDrafts;

  return (
    <section className="stack">
      <div className="action-row">
        <button className="secondary-button" onClick={tabCapture.runManualCapture} type="button">
          Round Up
        </button>
        <button className="secondary-button" onClick={tabCapture.runActiveTabCapture} type="button">
          Capture Tab
        </button>
        <button
          className="secondary-button"
          onClick={tabCapture.captureVisibleScreenshotAction}
          type="button"
        >
          Screenshot
        </button>
      </div>
      <div className="chickens-filter-row">
        {(['all', 'drafts', 'ready'] as const).map((f) => (
          <button
            key={f}
            className={filter === f ? 'is-active' : ''}
            onClick={() => setFilter(f)}
            type="button"
          >
            {f === 'all' ? 'All' : f === 'drafts' ? 'Drafts' : 'Ready'}
          </button>
        ))}
      </div>

      {!dashboard ? (
        <SkeletonCards count={3} label="Loading chickens" />
      ) : (
        <>
          {filter === 'all' && (
            <ul className="list-reset stack">
              {dashboard.candidates.map((candidate) => (
                <li className="draft-card" key={candidate.id}>
                  <strong>{candidate.title}</strong>
                  <div className="meta-text">{candidate.domain}</div>
                  <a className="source-link" href={candidate.url} rel="noreferrer" target="_blank">
                    {candidate.url}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="artifact-grid">
            {filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                context="roost"
                draftEditor={draftEditor}
                inferenceState={inferenceState}
                runtimeConfig={runtimeConfig}
                coops={dashboard.coops}
              />
            ))}
          </div>

          {filter === 'all' && dashboard.candidates.length === 0 && filteredDrafts.length === 0 ? (
            <div className="empty-state">Round up some tabs to see chickens here.</div>
          ) : null}

          {filter !== 'all' && filteredDrafts.length === 0 ? (
            <div className="empty-state">
              {filter === 'drafts' ? 'No working drafts yet.' : 'No drafts are ready to share yet.'}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
