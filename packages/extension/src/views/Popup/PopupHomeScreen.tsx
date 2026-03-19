import type { PopupActivityItem } from './popup-types';

export function PopupHomeScreen(props: {
  draftCount: number;
  lastCaptureLabel: string;
  syncLabel: string;
  recentItems: PopupActivityItem[];
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  onCaptureTab: () => void;
  onOpenFeed: () => void;
  onOpenDrafts: () => void;
}) {
  const {
    draftCount,
    lastCaptureLabel,
    syncLabel,
    recentItems,
    onPrimaryAction,
    primaryActionLabel,
    onCaptureTab,
    onOpenFeed,
    onOpenDrafts,
  } = props;

  return (
    <section className="popup-screen">
      <div className="popup-stat-grid" aria-label="Quick status">
        <div className="popup-stat">
          <span>Drafts</span>
          <strong>{draftCount}</strong>
        </div>
        <div className="popup-stat">
          <span>Last roundup</span>
          <strong>{lastCaptureLabel}</strong>
        </div>
        <div className="popup-stat">
          <span>Sync</span>
          <strong>{syncLabel}</strong>
        </div>
      </div>

      <div className="popup-stack">
        <button className="popup-primary-action" onClick={onPrimaryAction} type="button">
          {primaryActionLabel}
        </button>
        <div className="popup-split-actions">
          <button className="popup-secondary-action" onClick={onCaptureTab} type="button">
            Capture this tab
          </button>
          <button className="popup-secondary-action" onClick={onOpenFeed} type="button">
            Open feed
          </button>
        </div>
      </div>

      <section className="popup-list-section">
        <div className="popup-section-heading">
          <strong>What&apos;s waiting</strong>
          {draftCount > 0 ? (
            <button className="popup-text-button" onClick={onOpenDrafts} type="button">
              Review drafts
            </button>
          ) : null}
        </div>
        {recentItems.length > 0 ? (
          <ul className="popup-list-reset popup-activity-list">
            {recentItems.map((item) => (
              <li className="popup-activity-row" key={item.id}>
                <div className="popup-activity-row__copy">
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <span className="popup-mini-pill">{item.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="popup-empty-state">
            Nothing&apos;s loose right now. Capture a tab to start.
          </p>
        )}
      </section>
    </section>
  );
}
