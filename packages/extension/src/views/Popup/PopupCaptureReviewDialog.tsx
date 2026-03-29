import { useRef } from 'react';
import { Tooltip } from '../shared/Tooltip';
import { usePopupOverlayFocusTrap } from './hooks/usePopupOverlayFocusTrap';
import type { PopupPendingCapture } from './popup-types';

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="popup-theme-option__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function formatBytes(byteSize: number) {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }
  if (byteSize < 1024 * 1024) {
    return `${(byteSize / 1024).toFixed(1)} KB`;
  }
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(durationSeconds?: number) {
  if (!durationSeconds) {
    return null;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function labelForKind(kind: PopupPendingCapture['kind']) {
  if (kind === 'photo') return 'Screenshot';
  if (kind === 'audio') return 'Audio';
  return 'File';
}

export function PopupCaptureReviewDialog(props: {
  capture: PopupPendingCapture;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (patch: Partial<PopupPendingCapture>) => void;
}) {
  const { capture, onChange, onClose, onSave, saving } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  usePopupOverlayFocusTrap({
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  const durationLabel = formatDuration(capture.durationSeconds);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss is supplementary to the close button
    <div
      className="popup-dialog-backdrop"
      onClick={saving ? undefined : onClose}
      role="presentation"
    >
      <dialog
        aria-labelledby="popup-capture-review-title"
        aria-modal="true"
        className="popup-dialog"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        open
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="popup-dialog__header">
          <div className="popup-dialog__header-bar">
            <div className="popup-review-queue__pills">
              <span className="popup-mini-pill popup-mini-pill--muted">
                {labelForKind(capture.kind)}
              </span>
              <span className="popup-mini-pill">{formatBytes(capture.byteSize)}</span>
              {durationLabel ? <span className="popup-mini-pill">{durationLabel}</span> : null}
            </div>
            <Tooltip align="end" content="Close">
              {({ targetProps }) => (
                <button
                  {...targetProps}
                  aria-label="Close capture review"
                  className="popup-icon-button popup-dialog__close"
                  disabled={saving}
                  onClick={onClose}
                  ref={closeButtonRef}
                  type="button"
                >
                  <CloseIcon />
                </button>
              )}
            </Tooltip>
          </div>
          <h2 id="popup-capture-review-title">Add context before saving</h2>
        </div>

        <div className="popup-dialog__body">
          {capture.previewUrl ? (
            <div className="popup-preview-card">
              <img alt="" className="popup-preview-card__image" src={capture.previewUrl} />
            </div>
          ) : null}

          <section className="popup-dialog__section">
            <label className="popup-dialog__field">
              <span>Title</span>
              <input
                disabled={saving}
                onChange={(event) => onChange({ title: event.target.value })}
                type="text"
                value={capture.title}
              />
            </label>
            <label className="popup-dialog__field">
              <span>Context</span>
              <textarea
                disabled={saving}
                onChange={(event) => onChange({ note: event.target.value })}
                placeholder="What should Coop remember about this?"
                rows={4}
                value={capture.note}
              />
            </label>
          </section>

          <section className="popup-dialog__section">
            <strong>Details</strong>
            <div className="popup-dialog__meta">
              {capture.fileName ? (
                <span className="popup-mini-pill popup-mini-pill--muted">{capture.fileName}</span>
              ) : null}
              <span className="popup-mini-pill popup-mini-pill--muted">{capture.mimeType}</span>
              {capture.sourceUrl ? (
                <a href={capture.sourceUrl} rel="noreferrer" target="_blank">
                  Source page
                </a>
              ) : null}
            </div>
          </section>
        </div>

        <div className="popup-dialog__footer">
          <button
            className="popup-secondary-action"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="popup-primary-action popup-primary-action--small"
            disabled={saving || !capture.title.trim()}
            onClick={onSave}
            type="button"
          >
            {saving ? 'Saving…' : 'Save to Pocket Coop'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
