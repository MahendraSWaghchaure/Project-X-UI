import { createContext, useContext } from 'react';
import { resolveAutoTheme, type Theme, type ThemeMode } from './themeCore';

export interface ThemeContextValue {
  /** The user's choice: auto (follow the clock), or pinned day / night. */
  mode: ThemeMode;
  /** What is actually showing right now. */
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
}

/** Default (no provider, e.g. a component rendered in isolation in a test): auto mode, read-only. */
const FALLBACK: ThemeContextValue = { mode: 'auto', theme: resolveAutoTheme(), setMode: () => {} };

export const ThemeContext = createContext<ThemeContextValue>(FALLBACK);

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
