import { LIBRARY_SHELVES } from '@tvseri.es/schemas';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import {
  LIBRARY_NOT_FOUND_REWRITES,
  STATS_YEAR_NOT_FOUND_REWRITE,
  statsYearNotFoundRewrite,
  USERNAME_NOT_FOUND_REWRITE,
} from './profileNotFound';

const matcher = (source: string) =>
  getPathMatch(source, { removeUnnamedParams: true, strict: true });

describe('the static 404 for malformed usernames', () => {
  const matches = matcher(USERNAME_NOT_FOUND_REWRITE.source);

  it.each([
    '/u/n!na',
    '/u/ni$na/stats/2025',
    '/u/nina*',
    '/u/ab',
    `/u/${'n'.repeat(129)}`,
  ])('serves the static 404 for %s', (url) => {
    expect(matches(url)).not.toBe(false);
  });

  // A username stored before the slug rule (3 to 128 characters of anything)
  // keeps its pages: the router decides whether it exists
  it.each([
    '/u/nina',
    '/u/nina/stats/2025',
    '/u/nina-2/history',
    '/u/a1b2',
    '/u/Nina_R/stats/2025',
    '/u/n.i.n.a',
    '/u/-nina',
    '/u/ni--na/history',
    '/u/n%20ina',
    '/u/n%C3%AFna',
    `/u/${'n'.repeat(128)}`,
  ])('leaves %s to the router', (url) => {
    expect(matches(url)).toBe(false);
  });
});

describe("the static 404 rewrites leave the Profile's sub-pages alone", () => {
  const rewrites = [
    USERNAME_NOT_FOUND_REWRITE,
    STATS_YEAR_NOT_FOUND_REWRITE,
    ...LIBRARY_NOT_FOUND_REWRITES,
  ];

  it.each([
    '/u/nina',
    '/u/nina/history',
    '/u/nina/circle',
    '/u/nina/library',
    '/u/nina/library/',
    ...LIBRARY_SHELVES.map((shelf) => `/u/nina/library/${shelf}`),
    '/u/nina/stats/2025',
  ])('%s reaches the router', (url) => {
    for (const { source } of rewrites) {
      expect(matcher(source)(url)).toBe(false);
    }
  });
});

describe('the static 404 for malformed Stats years', () => {
  const matches = matcher(STATS_YEAR_NOT_FOUND_REWRITE.source);

  it.each([
    '/u/nina/stats/20x5',
    '/u/nina/stats/1999',
    '/u/nina/stats/02025',
    '/u/nina/stats/202',
    '/u/nina/stats/2025x/card',
  ])('serves the static 404 for %s', (url) => {
    expect(matches(url)).not.toBe(false);
  });

  it.each([
    '/u/nina/stats/2025',
    '/u/nina/stats/2026/card',
    '/u/nina/stats/2025/opengraph-image-1lgw4m',
  ])('leaves %s to the router', (url) => {
    expect(matches(url)).toBe(false);
  });
});

describe('the static 404 for Stats years without a page', () => {
  // as built in 2026: pages from 2000 to 2027
  const matches = matcher(statsYearNotFoundRewrite(2027).source);

  it.each([
    '/u/nina/stats/1999',
    '/u/nina/stats/2028',
    '/u/nina/stats/2099',
    '/u/nina/stats/2031/card',
  ])('serves the static 404 for %s', (url) => {
    expect(matches(url)).not.toBe(false);
  });

  it.each(['/u/nina/stats/2000', '/u/nina/stats/2026', '/u/nina/stats/2027'])(
    'leaves %s to the router',
    (url) => {
      expect(matches(url)).toBe(false);
    },
  );

  it("is built with next year's page", () => {
    const year = new Date().getUTCFullYear();
    const built = matcher(STATS_YEAR_NOT_FOUND_REWRITE.source);
    expect(built(`/u/nina/stats/${year + 1}`)).toBe(false);
    expect(built(`/u/nina/stats/${year + 2}`)).not.toBe(false);
  });
});

describe('the static 404 under the Library', () => {
  const matches = (url: string) =>
    LIBRARY_NOT_FOUND_REWRITES.some(
      ({ source }) => matcher(source)(url) !== false,
    );

  it.each([
    '/u/nina/library/junk',
    '/u/nina/library/favorites',
    '/u/nina/library/watchingx',
    '/u/nina/library/watching/x',
    '/u/nina/library/hidden/a/b',
    '/u/nina/library/junk/x',
  ])('serves the static 404 for %s', (url) => {
    expect(matches(url)).toBe(true);
  });

  it('lets every shelf through', () => {
    for (const shelf of LIBRARY_SHELVES) {
      expect(matches(`/u/nina/library/${shelf}`)).toBe(false);
    }
  });
});
