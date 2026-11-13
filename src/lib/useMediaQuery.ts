import { useEffect, useState } from 'react';

const canMatch = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** Tracks a CSS media query. Returns `fallback` when matchMedia is unavailable (jsdom, SSR). */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState(() => (canMatch() ? window.matchMedia(query).matches : fallback));
  useEffect(() => {
    if (!canMatch()) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
