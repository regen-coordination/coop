import { PopupThemeToggle } from './PopupThemePicker';
import type { PopupThemePreference } from './popup-types';

function DraftsIcon() {
  return (
    <svg aria-hidden="true" className="popup-theme-option__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M6 3.5h5l3.5 3.5V16.5H6z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M8.5 10h3M8.5 12.5h2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" className="popup-theme-option__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M3 7h14M3 10h14M3 13h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
      <circle cx="7" cy="7" r="1.6" fill="currentColor" />
      <circle cx="13" cy="10" r="1.6" fill="currentColor" />
      <circle cx="9" cy="13" r="1.6" fill="currentColor" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg aria-hidden="true" className="popup-theme-option__icon" fill="none" viewBox="0 0 20 20">
      <rect height="12" rx="2" stroke="currentColor" strokeWidth="1.4" width="14" x="3" y="4" />
      <path d="M11.5 4v12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function PopupHeader(props: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSwitch?: () => void;
  switchLabel?: string;
  themePreference: PopupThemePreference;
  onSetTheme: (theme: PopupThemePreference) => void;
  onOpenDrafts?: () => void;
  onOpenSettings?: () => void;
  onOpenWorkspace?: () => void;
}) {
  const {
    title,
    subtitle,
    onBack,
    onSwitch,
    switchLabel = 'Switch',
    themePreference,
    onSetTheme,
    onOpenDrafts,
    onOpenSettings,
    onOpenWorkspace,
  } = props;

  return (
    <header className="popup-header">
      <div className="popup-header__main">
        <div className="popup-header__title-row">
          {onBack ? (
            <button
              aria-label="Go back"
              className="popup-icon-button"
              onClick={onBack}
              type="button"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
          ) : (
            <div aria-hidden="true" className="popup-mark">
              <img alt="" className="popup-mark__image" src="/icons/icon-32.png" />
            </div>
          )}
          <div className="popup-header__copy">
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
        </div>
        <div className="popup-header__meta">
          {onOpenDrafts ? (
            <button
              aria-label="Drafts"
              className="popup-icon-button"
              onClick={onOpenDrafts}
              type="button"
            >
              <DraftsIcon />
            </button>
          ) : null}
          {onOpenSettings ? (
            <button
              aria-label="Settings"
              className="popup-icon-button"
              onClick={onOpenSettings}
              type="button"
            >
              <SettingsIcon />
            </button>
          ) : null}
          {onOpenWorkspace ? (
            <button
              aria-label="Open workspace"
              className="popup-icon-button"
              onClick={onOpenWorkspace}
              type="button"
            >
              <WorkspaceIcon />
            </button>
          ) : null}
          <PopupThemeToggle onSetTheme={onSetTheme} themePreference={themePreference} />
          {onSwitch ? (
            <button className="popup-text-button" onClick={onSwitch} type="button">
              {switchLabel}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
