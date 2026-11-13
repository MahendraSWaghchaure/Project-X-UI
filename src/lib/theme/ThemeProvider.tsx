import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';
import {
  AUTO_REEVALUATE_MS,
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredMode,
  resolveTheme,
  writeStoredMode,
  type ThemeMode,
} from './themeCore';

/**
 * Owns the day/night theme. Auto mode follows the local clock (06:00-18:00 = day) and re-checks on an
 * interval and whenever the tab becomes visible again; Day / Night pin it. The first paint is handled by the
 * inline script in index.html, this keeps the attribute in sync afterwards.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [theme, setTheme] = useState(() => resolveTheme(readStoredMode()));
  const modeRef = useRef(mode);
  const firstRender = useRef(true);

  const evaluate = useCallback((animate: boolean) => {
    const next = resolveTheme(modeRef.current);
    setTheme(next);
    applyTheme(next, animate);
  }, []);

  useEffect(() => {
    modeRef.current = mode;
    evaluate(!firstRender.current);
    firstRender.current = false;
  }, [mode, evaluate]);

  useEffect(() => {
    if (mode !== 'auto') return;
    const tick = () => evaluate(true);
    const id = window.setInterval(tick, AUTO_REEVALUATE_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [mode, evaluate]);

  // Another tab changed the preference.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY || e.key === null) setModeState(readStoredMode());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    writeStoredMode(next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, theme, setMode }), [mode, theme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
