import { DISCOVER_FILTER_KEYS } from '@tvseri.es/constants';
import { DiscoverQuerySchema } from '@tvseri.es/schemas';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { describe, expect, it } from 'vitest';

import { LEGACY_DISCOVER_REWRITES } from './legacyDiscover';

/** The rewrite (if any) that Next applies to a URL, with its own matchers */
function rewriteFor(url: string) {
  const parsed = new URL(url, 'http://localhost');
  const query = Object.fromEntries(parsed.searchParams);
  const request = { cookies: {}, headers: {} } as Parameters<
    typeof matchHas
  >[0];
  return LEGACY_DISCOVER_REWRITES.find(
    (rule) =>
      getPathMatch(rule.source, { strict: true })(parsed.pathname) &&
      matchHas(request, query, rule.has),
  );
}

describe('LEGACY_DISCOVER_REWRITES', () => {
  it('covers every discover filter key', () => {
    expect([...DISCOVER_FILTER_KEYS].sort()).toEqual(
      Object.keys(DiscoverQuerySchema.entries).sort(),
    );
  });

  it('sends an old filter link to the legacy redirect handler', () => {
    expect(rewriteFor('/discover?with_genres=80')?.destination).toBe(
      '/api/discover/legacy',
    );
    expect(
      rewriteFor('/discover?first_air_date.gte=2010-01-01')?.destination,
    ).toBe('/api/discover/legacy');
    expect(rewriteFor('/discover?sort_by=vote_average.desc')).toBeDefined();
  });

  it('leaves the hub and other pages alone', () => {
    expect(rewriteFor('/discover')).toBeUndefined();
    expect(rewriteFor('/discover?page=2')).toBeUndefined();
    expect(rewriteFor('/genre/crime?with_genres=80')).toBeUndefined();
  });
});
