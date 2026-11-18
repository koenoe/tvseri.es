import { LANDING_SLUGS, LANDING_TYPES } from '@tvseri.es/constants';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import { LANDING_NOT_FOUND_REWRITES } from './landingNotFound';

/**
 * Whether Next rewrites a URL to the static 404, with its own matcher and
 * options (`strict`, case-insensitive like `next start` and Vercel's router).
 */
const isStatic404 = (url: string) =>
  LANDING_NOT_FOUND_REWRITES.some(
    (rule) =>
      rule.destination === '/_not-found' &&
      getPathMatch(rule.source, { removeUnnamedParams: true, strict: true })(
        url,
      ) !== false,
  );

describe('LANDING_NOT_FOUND_REWRITES', () => {
  it('has one rewrite per landing type', () => {
    expect(LANDING_NOT_FOUND_REWRITES).toHaveLength(LANDING_TYPES.length);
  });

  it('leaves every landing slug to its page', () => {
    for (const type of LANDING_TYPES) {
      for (const slug of LANDING_SLUGS[type]) {
        const url = `/${type}/${slug}`;
        expect(isStatic404(url), url).toBe(false);
      }
    }
  });

  it.each([
    '/genre/not-a-genre',
    '/genre/crime-x',
    '/genre/xcrime',
    '/genre/constructor',
    '/theme/__proto__',
    '/theme/dystopias',
    '/network/hbo2',
    '/network/12345',
    '/country/zz',
    '/country/gbr',
    '/country/g',
    '/decade/2015s',
    '/decade/2030s',
    '/decade/1930s',
    '/decade/2010',
    '/language/zz',
    '/language/jap',
    '/genre/%3Cscript%3E',
  ])('serves the static 404 for %s', (url) => {
    expect(isStatic404(url)).toBe(true);
  });

  // `/network/49` is rewritten too, but its redirect to `/network/hbo` runs
  // first (redirects come before rewrites)
  it('leaves the index pages, deeper paths and other routes alone', () => {
    for (const url of [
      '/genre',
      '/country',
      '/language',
      '/discover',
      '/genre/crime/x',
      '/1396',
      '/person/abc',
      '/person/17419/bryan-cranston',
    ]) {
      expect(isStatic404(url)).toBe(false);
    }
  });

  it('matches without case, like the router: /country/GB reaches the page (its notFound())', () => {
    expect(isStatic404('/country/GB')).toBe(false);
    expect(isStatic404('/country/ZZ')).toBe(true);
  });
});
