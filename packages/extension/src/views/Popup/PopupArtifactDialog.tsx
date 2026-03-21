import { useEffect, useRef, useState } from 'react';
import type { PopupFeedArtifactItem } from './popup-types';

function formatCategoryLabel(value: string) {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

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

export function PopupArtifactDialog(props: {
  artifact: PopupFeedArtifactItem;
  onClose: () => void;
  onOpenInSidepanel: () => void | Promise<void>;
}) {
  const { artifact, onClose, onOpenInSidepanel } = props;
  const [imageMissing, setImageMissing] = useState(!artifact.previewImageUrl);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sourceLinks = artifact.sources.filter((source) => Boolean(source.url));

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const surface = document.querySelector<HTMLElement>('.popup-surface');
    const hadAriaHidden = surface?.getAttribute('aria-hidden');
    const hadInert = surface?.hasAttribute('inert') ?? false;

    if (surface) {
      surface.setAttribute('aria-hidden', 'true');
      surface.setAttribute('inert', '');
    }

    closeButtonRef.current?.focus();

    function getFocusableElements() {
      if (!dialogRef.current) {
        return [] as HTMLElement[];
      }

      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!activeElement || !dialogRef.current?.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last?.focus();
        return;
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      if (surface) {
        if (hadAriaHidden === null) {
          surface.removeAttribute('aria-hidden');
        } else {
          surface.setAttribute('aria-hidden', hadAriaHidden);
        }

        if (!hadInert) {
          surface.removeAttribute('inert');
        }
      }

      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="popup-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="popup-artifact-dialog-title"
        aria-modal="true"
        className="popup-dialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="popup-dialog__header">
          <div className="popup-dialog__header-bar">
            <div className="popup-review-queue__pills">
              <span className="popup-mini-pill popup-mini-pill--muted">{artifact.coopLabel}</span>
              <span className="popup-mini-pill">{formatCategoryLabel(artifact.category)}</span>
            </div>
            <button
              aria-label="Close details"
              className="popup-icon-button popup-dialog__close"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
          <h2 id="popup-artifact-dialog-title">{artifact.title}</h2>
        </div>

        <div className="popup-dialog__body">
          {artifact.previewImageUrl && !imageMissing ? (
            <div className="popup-preview-card">
              <img
                alt=""
                className="popup-preview-card__image"
                onError={() => setImageMissing(true)}
                src={artifact.previewImageUrl}
              />
            </div>
          ) : null}

          <section className="popup-dialog__section">
            <strong>Summary</strong>
            <p>{artifact.summary}</p>
          </section>

          <section className="popup-dialog__section">
            <strong>Why it matters</strong>
            <p>{artifact.whyItMatters}</p>
          </section>

          <section className="popup-dialog__section">
            <strong>Suggested next step</strong>
            <p>{artifact.suggestedNextStep}</p>
          </section>

          {sourceLinks.length > 0 ? (
            <section className="popup-dialog__section">
              <strong>Sources</strong>
              <ul className="popup-list-reset popup-dialog__sources">
                {sourceLinks.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noreferrer" target="_blank">
                      {source.label || source.domain}
                    </a>
                    <span>{source.domain}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="popup-dialog__actions">
            <button
              className="popup-primary-action popup-primary-action--small"
              onClick={() => void onOpenInSidepanel()}
              type="button"
            >
              Full view
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
