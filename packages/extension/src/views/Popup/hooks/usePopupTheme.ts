import { useEffect, useMemo, useState } from 'react';
import type { PopupResolvedTheme, PopupThemePreference } from '../popup-types';
import { usePersistedPopupState } from './usePersistedPopupState';

const popupThemeStorageKey = 'coop:popup-theme';
const popupThemeMediaQuery = '(prefers-color-scheme: dark)';

function readSystemTheme(): PopupResolvedTheme {
  return window.matchMedia?.(popupThemeMediaQuery).matches ? 'dark' : 'light';
}

function isPopupThemePreference(value: unknown): value is PopupThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function usePopupTheme() {
  const { state, loading, setState } = usePersistedPopupState<PopupThemePreference>(
    popupThemeStorageKey,
    'system',
  );
  const [systemTheme, setSystemTheme] = useState<PopupResolvedTheme>(() => readSystemTheme());

  useEffect(() => {
    const media = window.matchMedia?.(popupThemeMediaQuery);
    if (!media) {
      return;
    }

    const handleChange = (event?: MediaQueryListEvent) => {
      setSystemTheme((event?.matches ?? media.matches) ? 'dark' : 'light');
    };

    handleChange();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const themePreference = isPopupThemePreference(state) ? state : 'system';
  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;

  return useMemo(
    () => ({
      loading,
      resolvedTheme,
      themePreference,
      setThemePreference(nextTheme: PopupThemePreference) {
        setState(nextTheme);
      },
    }),
    [loading, resolvedTheme, setState, themePreference],
  );
}
