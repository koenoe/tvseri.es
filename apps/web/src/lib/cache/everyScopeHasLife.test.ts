import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sourceFiles } from '@/test/sourceFiles';

const SRC = path.resolve(import.meta.dirname, '../..');
const DIRECTIVE = /^\s*['"]use cache['"];?\s*$/m;

/**
 * A `'use cache'` scope without `cacheLife` takes Next's 15-minute `default`
 * profile, and caps every page it is in at that (`cacheLife.md`, "Nested
 * caching behavior"). Each scope names its CACHE_LIFE profile; a function
 * that only derives from cached reads needs no scope at all. Checked per
 * directive: a `cacheLife(` or `cacheLifeFor(` (its profile, or
 * `unavailable` when a read failed) before the next directive in the file.
 */
describe("every 'use cache' scope", () => {
  it('names its cacheLife profile', () => {
    const missing = sourceFiles(SRC).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split(DIRECTIVE)
        .slice(1)
        .filter((scope) => !/\bcacheLife(For)?\(/.test(scope))
        .map(() => path.relative(SRC, file)),
    );
    expect(missing).toEqual([]);
  });
});
