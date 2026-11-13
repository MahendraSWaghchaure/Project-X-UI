/** Pure theme helpers (no React) so the same rules are unit-testable and mirrored by the inline script in index.html. */

export type Theme = 'day' | 'night';
export type ThemeMode = 'auto' | Theme;

export const THEME_STORAGE_KEY = 'sunju-theme-mode';
/** Auto mode: day from 06:00 (inclusive) until 18:00 (exclusive), local time. Keep in sync with index.html. */
export const DAY_START_HOUR = 6;
export const NIGHT_START_HOUR = 18;
/** How often Auto mode re-evaluates the clock (also re-evaluated on visibilitychange). */
export const AUTO_REEVALUATE_MS = 60_000;

export const THEME_COLOR: Record<Theme, string> = { day: '#B7D8F5', night: '#030407' };

export function resolveAutoTheme(now: Date = new Date()): Theme {
  const hour = now.getHours();
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'day' : 'night';
}

export function resolveTheme(mode: ThemeMode, now: Date = new Date()): Theme {
  return mode === 'auto' ? resolveAutoTheme(now) : mode;
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'auto' || value === 'day' || value === 'night';
}

/** localStorage can throw (private windows, blocked site data) - every access is wrapped. */
export function readStoredMode(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeStoredMode(mode: ThemeMode): void {
  try {
    if (mode === 'auto') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable: the choice simply lasts for this page view */
  }
}

let transitionTimer: number | undefined;

/** Sets data-theme on <html>. With `animate`, briefly enables the colour cross-fade (CSS skips it under prefers-reduced-motion). */
export function applyTheme(theme: Theme, animate = false): void {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') === theme) return;
  if (animate) {
    root.setAttribute('data-theme-transition', '');
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => root.removeAttribute('data-theme-transition'), 450);
  }
  root.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
}
