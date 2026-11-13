import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resources } from '../i18n';

type Tree = { [key: string]: string | Tree };

function lookup(tree: Tree, key: string): string | Tree | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return node;
}

/** A key exists if it resolves directly or through i18next plural suffixes (_one / _other). */
function exists(tree: Tree, key: string): boolean {
  return lookup(tree, key) !== undefined || lookup(tree, `${key}_other`) !== undefined;
}

// Files that are not app source (comments in here mention t('...') as documentation, not real calls),
// plus the locales directory itself and this test file.
const EXCLUDE = [join('src', 'lib', 'locales'), join('src', 'test', 'setup.ts')];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !EXCLUDE.some((x) => full.includes(x))) out.push(full);
  }
  return out;
}

// Literal keys passed to t('...') / i18n.t('...'), plus schema-message keys written as 'validation.xxx' / 'payroll.xxx' strings.
const T_CALL = /\bt\(\s*'([A-Za-z][\w]*(?:\.[\w]+)+)'/g;
const SCHEMA_KEY = /,\s*'((?:validation|payroll|routes|vehicles|auth)\.[\w.]+)'\s*\)/g;

describe('i18n key audit', () => {
  const files = walk(join(process.cwd(), 'src'));
  const used = new Map<string, string>();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const re of [T_CALL, SCHEMA_KEY]) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) if (!used.has(m[1])) used.set(m[1], file);
    }
  }

  it('finds the keys the app uses', () => {
    expect(used.size).toBeGreaterThan(300);
  });

  for (const lang of ['en', 'hi'] as const) {
    it(`every literal t() key resolves in ${lang}`, () => {
      const tree = resources[lang].translation as Tree;
      const missing = [...used.entries()].filter(([key]) => !exists(tree, key)).map(([key, file]) => `${key}  (${file.split('src')[1]})`);
      expect(missing).toEqual([]);
    });
  }
});
