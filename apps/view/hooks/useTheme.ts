import { useCallback, useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ai-trip-planner:theme-preference';

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => getStoredPreference());
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemPreference());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const effectiveTheme = useMemo(() => (preference === 'system' ? systemTheme : preference), [preference, systemTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [effectiveTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreference(next);
  }, []);

  return {
    theme: preference,
    setTheme,
    effectiveTheme,
  } as const;
}
