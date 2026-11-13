// WCAG contrast check for the Day/Night palette in src/index.css.
// Usage: node scripts/contrast-check.mjs   (exit code 1 if any required pair fails)
// Parses the day tokens from the @theme block and the night overrides from `:root[data-theme="night"]`,
// resolving var() and color-mix(in srgb, ...) so changing --color-cobalt is re-verified automatically.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const css = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/index.css'), 'utf8');

function block(startRe) {
  const m = startRe.exec(css);
  if (!m) throw new Error('block not found ' + startRe);
  let i = css.indexOf('{', m.index) + 1;
  let depth = 1;
  const start = i;
  while (depth > 0) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') depth--;
    i++;
  }
  return css.slice(start, i - 1);
}
function decls(body) {
  const out = {};
  // drop nested @keyframes blocks
  const flat = body.replace(/@keyframes[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  for (const m of flat.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const day = decls(block(/@theme\s*\{/));
const night = { ...day, ...decls(block(/:root\[data-theme="night"\]\s*\{/)) };

function parse(v, vars) {
  v = v.trim();
  let m;
  if ((m = /^var\((--[\w-]+)\)$/.exec(v))) return parse(vars[m[1]], vars);
  if (v === 'white') return [255, 255, 255];
  if (v === 'black') return [0, 0, 0];
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(v))) {
    let h = m[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  if ((m = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*(.+)\)$/.exec(v))) {
    const a = parse(m[1], vars);
    const b = parse(m[3], vars);
    const p = +m[2] / 100;
    return a.map((x, i) => x * p + b[i] * (1 - p));
  }
  throw new Error('cannot parse ' + v);
}
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [label, fg token, bg token, minimum]
const PAIRS = {
  day: [
    ['body text on page (baby blue)', 'ink', 'page', 4.5],
    ['muted text on page', 'ink-muted', 'page', 4.5],
    ['body text on card', 'ink', 'surface', 4.5],
    ['muted text on card', 'ink-muted', 'surface', 4.5],
    ['slate-500 text on card', 'slate-500', 'surface', 4.5],
    ['slate-400 text on card', 'slate-400', 'surface', 4.5],
    ['slate-500 on page', 'slate-500', 'page', 4.5],
    ['slate-400 on page', 'slate-400', 'page', 4.5],
    ['slate-600 on page', 'slate-600', 'page', 4.5],
    ['input border (slate-300) vs card', 'slate-300', 'surface', 3],
    ['primary link text on card', 'primary-text', 'surface', 4.5],
    ['primary link text on page', 'primary-text', 'page', 4.5],
    ['white on primary button (red)', 'on-primary', 'primary', 4.5],
    ['white on primary hover', 'on-primary', 'primary-hover', 4.5],
    ['primary red on page (large/UI only)', 'primary', 'page', 3],
    ['dark text on accent (yellow)', 'on-accent', 'accent', 4.5],
    ['accent text (dark gold) on card', 'accent-text', 'surface', 4.5],
    ['white on danger solid (red-600)', 'white', 'red-600', 4.5],
    ['danger text (red-600) on card', 'red-600', 'surface', 4.5],
    ['danger text (red-600) on page', 'red-600', 'page', 4.5],
    ['red-700 on red-50', 'red-700', 'red-50', 4.5],
    ['green-700 on green-100', 'green-700', 'green-100', 4.5],
    ['amber-700 on amber-100', 'amber-700', 'amber-100', 4.5],
    ['safe-700 on safe-100', 'safe-700', 'safe-100', 4.5],
    ['pending-700 on pending-100', 'pending-700', 'pending-100', 4.5],
    ['alert-700 on alert-100', 'alert-700', 'alert-100', 4.5],
    ['white on safe-600', 'white', 'safe-600', 4.5],
    ['info-700 on info-100', 'info-700', 'info-100', 4.5],
    ['white on info-600', 'white', 'info-600', 4.5],
    ['white on alert-600', 'white', 'alert-600', 4.5],
    ['nav text on nav bg', 'nav-ink', 'nav-bg', 4.5],
    ['nav muted on nav bg', 'nav-muted', 'nav-bg', 4.5],
    ['primary-text on primary-soft', 'primary-text', 'primary-soft', 4.5],
    ['focus ring vs page', 'focus', 'page', 3],
    ['focus ring vs card', 'focus', 'surface', 3],
  ],
  night: [
    ['body text on page', 'ink', 'page', 4.5],
    ['muted text on page', 'ink-muted', 'page', 4.5],
    ['body text on card', 'ink', 'surface', 4.5],
    ['muted text on card', 'ink-muted', 'surface', 4.5],
    ['muted text on surface-2', 'ink-muted', 'surface-2', 4.5],
    ['slate-500 on card', 'slate-500', 'surface', 4.5],
    ['slate-400 on card', 'slate-400', 'surface', 4.5],
    ['input border (slate-300) vs card', 'slate-300', 'surface', 3],
    ['primary link text (cobalt tint) on card', 'primary-text', 'surface', 4.5],
    ['primary link text on page', 'primary-text', 'page', 4.5],
    ['raw cobalt as text on page (informational: why primary-text exists)', 'primary', 'page', 0],
    ['white on primary button (cobalt)', 'on-primary', 'primary', 4.5],
    ['white on primary hover', 'on-primary', 'primary-hover', 4.5],
    ['dark text on accent (lime)', 'on-accent', 'accent', 4.5],
    ['lime accent text on page', 'accent-text', 'page', 4.5],
    ['white on danger solid (red-600)', 'white', 'red-600', 4.5],
    ['danger text (red-700 light) on card', 'red-700', 'surface', 4.5],
    ['red-700 on red-100', 'red-700', 'red-100', 4.5],
    ['green-700 on green-100', 'green-700', 'green-100', 4.5],
    ['amber-700 on amber-100', 'amber-700', 'amber-100', 4.5],
    ['safe-700 on safe-100', 'safe-700', 'safe-100', 4.5],
    ['pending-700 on pending-100', 'pending-700', 'pending-100', 4.5],
    ['alert-700 on alert-100', 'alert-700', 'alert-100', 4.5],
    ['white on safe-600', 'white', 'safe-600', 4.5],
    ['info-700 on info-100', 'info-700', 'info-100', 4.5],
    ['white on info-600', 'white', 'info-600', 4.5],
    ['white on alert-600', 'white', 'alert-600', 4.5],
    ['nav text on nav bg', 'nav-ink', 'nav-bg', 4.5],
    ['nav muted on nav bg', 'nav-muted', 'nav-bg', 4.5],
    ['primary-text on primary-soft', 'primary-text', 'primary-soft', 4.5],
    ['text-blue-700 on blue-100', 'blue-700', 'blue-100', 4.5],
    ['focus ring vs page', 'focus', 'page', 3],
    ['focus ring vs card', 'focus', 'surface', 3],
  ],
};

let failed = 0;
for (const [theme, vars] of [
  ['day', day],
  ['night', night],
]) {
  console.log(`\n== ${theme.toUpperCase()} ==`);
  const get = (t) => (t === 'white' ? [255, 255, 255] : parse(`var(--color-${t})`, vars));
  for (const [label, fg, bg, min] of PAIRS[theme]) {
    const r = ratio(get(fg), get(bg));
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${label}`);
  }
}
console.log(failed ? `\n${failed} pair(s) FAILED` : '\nAll required pairs pass');
process.exit(failed ? 1 : 0);
