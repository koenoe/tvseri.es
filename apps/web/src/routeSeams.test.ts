import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A page folder's private folders (`_lib`, `_data`, `_components`,
 * `_actions`, any `_name`) belong to that route segment and the segments
 * below it. Nothing else imports them: not `src/lib`, `src/components` or
 * `app/api`, and not another route. Code that several areas use lives in
 * `src/lib/<domain>` or `components/ui`, or in the private folder of the
 * segment the users share. So one page can be reshaped without breaking
 * another.
 *
 * A parallel-route slot (`@aside/history`) renders for its sibling route
 * (`history`), so it counts as part of it. The style guide (`/dev/style-guide`,
 * `next dev` only) shows page parts as they are, so it may import them.
 */

const WEB = path.resolve(import.meta.dirname, '..');
const SRC = path.join(WEB, 'src');
const SCANNED = ['src', 'e2e', 'test'].map((dir) => path.join(WEB, dir));

/** Routes allowed to import any page's private folders */
const MAY_IMPORT_PAGE_PARTS = ['src/app/(site)/dev/style-guide/'];

const SPECIFIER =
  /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|\bvi\.(?:mock|doMock|importActual|importMock)(?:<[^>]*>)?\(\s*|\brequire\(\s*)['"]([^'"]+)['"]/g;

type Source = Readonly<{ file: string; text: string }>;
type Violation = Readonly<{ from: string; to: string }>;

/** `src/app/(site)/u/[username]/(profile)/@aside/history` → without `@aside` */
const withoutSlots = (file: string) =>
  file
    .split('/')
    .filter((part) => !part.startsWith('@'))
    .join('/');

/** The segment that owns a private folder, or null when `target` is in none */
function privateOwner(target: string): string | null {
  if (!target.startsWith('src/app/')) {
    return null;
  }
  const parts = target.split('/');
  const index = parts.findIndex((part, i) => i > 1 && part.startsWith('_'));
  return index === -1 ? null : parts.slice(0, index).join('/');
}

/** Resolves a specifier to a path relative to apps/web, or null for a package */
function resolveSpecifier(from: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return path.posix.join('src', specifier.slice(2));
  }
  if (specifier.startsWith('.')) {
    return path.posix.join(path.posix.dirname(from), specifier);
  }
  return null;
}

/** Every import of a private folder from outside the segment that owns it */
function privateImportViolations(
  sources: ReadonlyArray<Source>,
): ReadonlyArray<Violation> {
  return sources.flatMap(({ file, text }) => {
    if (MAY_IMPORT_PAGE_PARTS.some((dir) => file.startsWith(dir))) {
      return [];
    }
    return [...text.matchAll(SPECIFIER)].flatMap(([, specifier = '']) => {
      const target = resolveSpecifier(file, specifier);
      const owner = target && privateOwner(target);
      if (!target || !owner) {
        return [];
      }
      return withoutSlots(file).startsWith(`${withoutSlots(owner)}/`)
        ? []
        : [{ from: file, to: target }];
    });
  });
}

function sourceFiles(dir: string): ReadonlyArray<string> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourceFiles(file);
    }
    return /\.(?:ts|tsx|mts)$/.test(entry.name) ? [file] : [];
  });
}

const SHOW = 'src/app/(site)/[id]/[[...slug]]';
const PROFILE = 'src/app/(site)/u/[username]/(profile)';

describe('privateImportViolations', () => {
  it('flags lib, components and API routes importing a page folder', () => {
    const sources = [
      {
        file: 'src/lib/marking/useTitle.ts',
        text: `import useSeason from '@/app/(site)/[id]/[[...slug]]/_lib/useSeason';`,
      },
      {
        file: 'src/components/ui/tile/Tile.tsx',
        text: `vi.mock('../../../app/(site)/u/[username]/(profile)/library/_components/Overlay', () => ({}));`,
      },
      {
        file: 'src/app/api/series/[id]/route.ts',
        text: `const m = await import('@/app/(site)/[id]/[[...slug]]/_data/loaders');`,
      },
    ];
    expect(privateImportViolations(sources)).toEqual([
      { from: sources[0]?.file, to: `${SHOW}/_lib/useSeason` },
      {
        from: sources[1]?.file,
        to: `${PROFILE}/library/_components/Overlay`,
      },
      { from: sources[2]?.file, to: `${SHOW}/_data/loaders` },
    ]);
  });

  it('flags a route importing a sibling’s or a child’s private folder', () => {
    const sources = [
      {
        file: `${PROFILE}/_components/shell/Count.tsx`,
        text: `import { useCount } from '../../library/_lib/counts';`,
      },
      {
        file: 'src/app/(site)/u/[username]/stats/[year]/page.tsx',
        text: `import { format } from '../../(profile)/_lib/format';`,
      },
    ];
    expect(privateImportViolations(sources).map(({ to }) => to)).toEqual([
      `${PROFILE}/library/_lib/counts`,
      `${PROFILE}/_lib/format`,
    ]);
  });

  it('lets a segment, its children and its slots use its private folders', () => {
    const sources = [
      {
        file: `${PROFILE}/history/_components/Diary.tsx`,
        text: `import { buildDiary } from '../_lib/diary';\nimport Dot from '../../_components/blocks/Dot';`,
      },
      {
        file: `${PROFILE}/@aside/history/layout.tsx`,
        text: `import JumpTo from '../../history/_components/JumpTo';`,
      },
      {
        file: 'src/app/(site)/dev/style-guide/_sections/HistorySection.tsx',
        text: `import DiaryEnd from '@/app/(site)/u/[username]/(profile)/history/_components/DiaryEnd';`,
      },
      {
        file: 'src/lib/series/loaders.ts',
        text: `import { apiFetch } from '@/lib/api/client';\nimport type { TvSeries } from '@tvseri.es/schemas';`,
      },
    ];
    expect(privateImportViolations(sources)).toEqual([]);
  });
});

describe('apps/web', () => {
  it('imports no page’s private folder from outside its segment', () => {
    // not this file: its fixtures are violations on purpose
    const files = SCANNED.flatMap(sourceFiles).filter(
      (file) => file !== import.meta.filename,
    );
    const sources = files.map((file) => ({
      file: path.relative(WEB, file).split(path.sep).join('/'),
      text: readFileSync(file, 'utf8'),
    }));

    // the scan found the app, so an empty list means something
    expect(files.some((file) => file.startsWith(path.join(SRC, 'app')))).toBe(
      true,
    );
    expect(privateImportViolations(sources)).toEqual([]);
  });
});
