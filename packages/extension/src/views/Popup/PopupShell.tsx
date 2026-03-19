import { type PropsWithChildren, useEffect } from 'react';
import type { PopupResolvedTheme } from './popup-types';

export function PopupShell({
  children,
  message,
  theme,
}: PropsWithChildren<{
  message?: string;
  theme: PopupResolvedTheme;
}>) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.body.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className="popup-app" data-theme={theme}>
      <div className="popup-surface">
        {message ? (
          <output className="popup-banner" aria-live="polite">
            {message}
          </output>
        ) : null}
        {children}
      </div>
    </div>
  );
}
