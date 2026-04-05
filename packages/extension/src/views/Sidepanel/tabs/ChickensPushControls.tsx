import type { CoopSharedState } from '@coop/shared';
import { useState } from 'react';
import type { useDraftEditor } from '../hooks/useDraftEditor';
import type { ReviewItem } from './chickens-helpers';

// ---------------------------------------------------------------------------
// PushControls
// ---------------------------------------------------------------------------

export interface PushControlsProps {
  item: ReviewItem;
  coops: CoopSharedState[];
  draftEditor?: ReturnType<typeof useDraftEditor>;
}

/** Render push controls for all review items — unified across signals and drafts. */
export function PushControls(props: PushControlsProps) {
  const { item, coops, draftEditor } = props;
  const [showPicker, setShowPicker] = useState(false);

  // Stale observations have no push target
  if (item.kind === 'stale' || !draftEditor) return null;

  const handlePush = (coopId: string) => {
    if (item.draft) {
      // Draft exists — publish directly
      if (!item.draft.suggestedTargetCoopIds.includes(coopId)) {
        draftEditor.toggleDraftTargetCoop(item.draft, coopId);
      }
      void draftEditor.publishDraft(item.draft);
    } else if (item.signal) {
      // Orphan signal — promote to draft then publish
      void draftEditor.promoteSignalAndPublish(item.signal, coopId);
    }
    setShowPicker(false);
  };

  // 0 targets: "Select coops"
  if (coops.length === 0) {
    return (
      <div className="compact-card__actions">
        <button
          className="compact-card__push-btn compact-card__push-btn--muted"
          disabled
          type="button"
        >
          Select coops
        </button>
      </div>
    );
  }

  // 1 target: "Push to <Coop>"
  if (coops.length === 1) {
    return (
      <div className="compact-card__actions">
        <button
          className="compact-card__push-btn"
          onClick={() => handlePush(coops[0].profile.id)}
          type="button"
        >
          Push to {coops[0].profile.name}
        </button>
      </div>
    );
  }

  // 2-4 targets: equal target pills
  if (coops.length <= 4) {
    return (
      <div className="compact-card__actions compact-card__actions--pills">
        {coops.map((coop) => (
          <button
            className="compact-card__target-pill"
            key={coop.profile.id}
            onClick={() => handlePush(coop.profile.id)}
            type="button"
          >
            {coop.profile.name}
          </button>
        ))}
      </div>
    );
  }

  // 5+ targets: selector/dropdown
  return (
    <div className="compact-card__actions">
      <div className="compact-card__push-wrap">
        <button
          className="compact-card__push-btn"
          onClick={() => setShowPicker((prev) => !prev)}
          type="button"
        >
          Push to...
        </button>
        {showPicker ? (
          <ul className="compact-card__coop-picker">
            {coops.map((coop) => (
              <li key={coop.profile.id}>
                <button onClick={() => handlePush(coop.profile.id)} type="button">
                  {coop.profile.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
