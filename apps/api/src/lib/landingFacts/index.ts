import {
  type LandingFilter,
  type LandingType,
  landingFilter,
} from '@tvseri.es/constants';
import type { LandingCounts, LandingFacts } from '@tvseri.es/schemas';

import { readThrough } from '@/lib/db/cache/readThrough';
import { fetchDiscoverCount } from '@/lib/tmdb/discover';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { createLimiter } from '@/utils/limit';

import { countryFacts } from './country';
import { genreFacts } from './genre';
import { networkFacts } from './network';
import { createCounter, createLimited } from './shared';
import { themeFacts } from './theme';

const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

const cacheKey = (type: LandingType, slug: string) =>
  `landing-facts:v3:${type}:${slug}`;

const compute = async (
  type: LandingType,
  slug: string,
  filter: LandingFilter,
): Promise<LandingFacts> => {
  const limited = createLimited();
  const count = createCounter(limited);

  switch (type) {
    case 'genre':
      return genreFacts({ count, filter, limited, slug, today: new Date() });
    case 'theme':
      return themeFacts({ count, filter, limited, slug });
    case 'network':
      return networkFacts({ count, filter, limited, slug });
    case 'country':
      return countryFacts({ count, filter, slug });
    case 'decade':
      return { count: await count(filter), slug, type };
    case 'language':
      return { count: await count(filter), slug, type };
  }
};

/**
 * The numbers a landing draws, computed on read from TMDB discover counts and
 * kept in the Cache table for 7 days. `undefined` when the slug isn't a
 * landing. A TMDB failure throws (or serves the expired answer, when the
 * table still holds one), so a partial answer is never kept.
 */
export const getLandingFacts = async (
  type: LandingType,
  rawSlug: string,
): Promise<LandingFacts | undefined> => {
  const slug = rawSlug.toLowerCase();
  const filter = landingFilter(type, slug);
  if (!filter) {
    return undefined;
  }

  // Stale if error: an expired answer still in the table beats a failure
  return readThrough(cacheKey(type, slug), CACHE_TTL, () =>
    compute(type, slug, filter),
  );
};

/**
 * Each landing's show count, the number its facts report as `count`, without
 * the rest of the facts. Slugs that aren't landings are left out. A TMDB
 * failure throws, so a partial answer is never served.
 */
export const getLandingCounts = async (
  type: LandingType,
  slugs: ReadonlyArray<string>,
): Promise<LandingCounts> => {
  const limited = createLimiter(TMDB_CONCURRENCY);
  const counted = await Promise.all(
    slugs.map(async (slug) => {
      const filter = landingFilter(type, slug);
      return filter
        ? ([slug, await limited(() => fetchDiscoverCount(filter))] as const)
        : undefined;
    }),
  );

  return { counts: Object.fromEntries(counted.filter((entry) => !!entry)) };
};
