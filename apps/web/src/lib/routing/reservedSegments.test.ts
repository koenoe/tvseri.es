import { readdirSync } from 'node:fs';
import path from 'node:path';

import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import {
  LONG_ID_NOT_FOUND_REWRITES,
  NOT_FOUND_REWRITE,
  PERSON_NOT_FOUND_REWRITE,
  RESERVED_SEGMENTS,
  RESERVED_SUBPATH_NOT_FOUND_REWRITES,
} from './reservedSegments';

const APP_DIR = path.resolve(import.meta.dirname, '../../app');

/** Top-level URL segments of the app router: route groups are flattened, private folders skipped. */
function topLevelSegments(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .flatMap((entry) =>
      entry.name.startsWith('(') && entry.name.endsWith(')')
        ? topLevelSegments(path.join(dir, entry.name))
        : [entry.name],
    );
}

const matchesNotFound = getPathMatch(NOT_FOUND_REWRITE.source, {
  removeUnnamedParams: true,
  strict: true,
});

describe('reserved first segments', () => {
  it('lists every static top-level route, so the root [id] rewrite never swallows one', () => {
    const staticSegments = topLevelSegments(APP_DIR).filter(
      (segment) => !segment.startsWith('['),
    );
    expect(staticSegments.length).toBeGreaterThan(5);
    for (const segment of staticSegments) {
      expect(
        RESERVED_SEGMENTS,
        `add "${segment}" to RESERVED_SEGMENTS`,
      ).toContain(segment);
    }
  });

  it('only lists segments that exist as routes', () => {
    const segments = topLevelSegments(APP_DIR);
    // `/api` is always reserved: rewrite-only URLs live under it too
    for (const segment of RESERVED_SEGMENTS.filter((s) => s !== 'api')) {
      expect(segments, `"${segment}" is not a route any more`).toContain(
        segment,
      );
    }
  });
});

describe('the static 404 rewrite', () => {
  it.each([
    '/abc',
    '/abc/def',
    '/12a',
    '/tv/abc',
    '/tv',
    '/track/abc/x',
    '/discovery',
  ])('serves the static 404 for %s', (url) => {
    expect(matchesNotFound(url)).not.toBe(false);
  });

  it.each([
    '/1396',
    '/1396/breaking-bad',
    '/0123/x',
    '/discover',
    '/genre/crime',
    '/settings',
    '/settings/plex',
    '/u/margaux',
    '/person/17419',
    '/api/auth/callback',
    '/robots.txt',
    '/icon.svg',
    '/_next/static/chunk.js',
  ])('leaves %s to the router', (url) => {
    expect(matchesNotFound(url)).toBe(false);
  });
});

describe('the static 404 for person ids', () => {
  const matches = getPathMatch(PERSON_NOT_FOUND_REWRITE.source, {
    removeUnnamedParams: true,
    strict: true,
  });

  it.each(['/person/abc', '/person/abc/x', '/person/12a', '/person/17419x'])(
    'serves the static 404 for %s',
    (url) => {
      expect(matches(url)).not.toBe(false);
    },
  );

  it.each([
    '/person/17419',
    '/person/17419/bryan-cranston',
    '/person/017419/x',
  ])('leaves %s to the router', (url) => {
    expect(matches(url)).toBe(false);
  });
});

describe('the static 404 for ids longer than any TMDB id', () => {
  const matchers = LONG_ID_NOT_FOUND_REWRITES.map(({ source }) =>
    getPathMatch(source, { removeUnnamedParams: true, strict: true }),
  );
  const matches = (url: string) => matchers.some((match) => match(url));

  it.each([
    '/123456789',
    '/99999999999',
    '/123456789/some-slug',
    '/person/123456789',
    '/person/99999999999/x',
  ])('serves the static 404 for %s', (url) => {
    expect(matches(url)).toBe(true);
  });

  it.each([
    '/1396',
    '/12345678/eight-digits',
    '/136315/the-bear',
    // a leading zero goes to the show page's canonical redirect
    '/000000001396',
    '/person/17419/bryan-cranston',
    '/person/12345678',
    '/discover',
  ])('leaves %s to the router', (url) => {
    expect(matches(url)).toBe(false);
  });
});

/** Every page URL under `dir` as a pattern: `[x]` → `x`, groups flattened */
function pagePaths(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isFile()) {
      return entry.name === 'page.tsx' ? [prefix || '/'] : [];
    }
    if (entry.name.startsWith('_')) return [];
    const group = entry.name.startsWith('(') && entry.name.endsWith(')');
    const segment = entry.name.replace(/^\[+\.*([^\]]+)\]+$/, '$1');
    return pagePaths(
      path.join(dir, entry.name),
      group ? prefix : `${prefix}/${segment}`,
    );
  });
}

describe('the static 404 under a reserved segment no route of its own serves', () => {
  const matchers = RESERVED_SUBPATH_NOT_FOUND_REWRITES.map(({ source }) =>
    getPathMatch(source, { removeUnnamedParams: true, strict: true }),
  );
  const matches = (url: string) => matchers.some((match) => match(url));

  it.each([
    '/settings/services',
    '/settings/profile/x',
    '/privacy/x',
    '/discover/x',
    '/dev/x',
    '/dev/home/x',
    '/sign-in/x',
    '/genre/drama/x',
    '/network/hbo/x/y',
  ])('serves the static 404 for %s', (url) => {
    expect(matches(url)).toBe(true);
  });

  it('leaves every page of the app to the router', () => {
    const pages = pagePaths(APP_DIR);
    expect(pages).toContain('/settings/streaming-services');
    for (const page of pages) {
      expect(matches(page), page).toBe(false);
    }
  });
});
