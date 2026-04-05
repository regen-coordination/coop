import { useState } from 'react';
import { type LanguageCode, useI18n } from '../hooks/useI18n';
import '../styles/language-selector.css';

const LANGUAGES: Array<{ code: LanguageCode; label: string; nativeName: string }> = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'pt', label: 'Português', nativeName: 'Português' },
  { code: 'es', label: 'Español', nativeName: 'Español' },
  { code: 'zh', label: '中文', nativeName: '中文' },
  { code: 'fr', label: 'Français', nativeName: 'Français' },
];

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = LANGUAGES.find((l) => l.code === language);
  const displayLabel = currentLanguage?.code.toUpperCase() ?? 'EN';

  const handleSelectLanguage = (lang: LanguageCode) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className={`language-selector-shell ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="language-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Current language: ${currentLanguage?.label ?? 'English'}. Select language`}
        title="Select language"
      >
        <span className="language-selector-label">{displayLabel}</span>
        <svg
          className="language-selector-chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className="language-selector-dropdown" aria-label="Available languages">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                className={`language-selector-option ${language === lang.code ? 'is-active' : ''}`}
                onClick={() => handleSelectLanguage(lang.code)}
                aria-pressed={language === lang.code}
                title={lang.label}
              >
                <span className="option-code">{lang.code.toUpperCase()}</span>
                <span className="option-name">{lang.nativeName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
