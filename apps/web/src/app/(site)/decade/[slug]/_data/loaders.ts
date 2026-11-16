import 'server-only';

import { landingFilter } from '@tvseri.es/constants';
import { cacheLife, cacheTag } from 'next/cache';

import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

import {
  discoverQueryString,
  getDiscoverShows,
} from '../../../_discover/data/discover';
import { discoverRowSource } from '../../../_discover/data/rowSources';
import {
  getShowSummaries,
  summaryIds,
} from '../../../_discover/data/summaries';
import type { RowLoader } from '../../../_discover/landing/planRow';
import {
  buildLandscape,
  LANDSCAPE_SIZE,
  type LandscapeShow,
} from './landscape';

/** "2010s": the decade's window (`first_air_date`), null for a slug that isn't one */
export function decadeOf(slug: string) {
  const filter = landingFilter('decade', slug);
  if (!filter) {
    return null;
  }
  const from = Number(slug.slice(0, 4));
  return { filter, from, label: slug, slug, to: from + 9 } as const;
}

/** The decade's shows, most-rated first (the treemap) */
export const landscapeQuery = (slug: string): string =>
  discoverQueryString({
    ...landingFilter('decade', slug),
    sort_by: 'vote_count.desc',
  });

/**
 * "Missed by most": rated as well, seen by a fraction: a TMDB
 * score of 7.5 or more from 100 to 999 votes, best-rated first. The floor
 * of 100 keeps out shows a handful of people rated 10.
 */
export const missedQuery = (slug: string): string =>
  discoverQueryString({
    ...landingFilter('decade', slug),
    sort_by: 'vote_average.desc',
    'vote_average.gte': '7.5',
    'vote_count.gte': '100',
    'vote_count.lte': '999',
  });

/**
 * The landscape for a decade slug (cached `medium`, like discover and the
 * summaries it reads): the eleven most-rated shows laid out as the treemap,
 * with each card's meta and reason. `Unavailable` (cached for seconds) when
 * the API can't answer, so the prerender never fails on it.
 */
export async function getLandscape(
  slug: string,
): Promise<ReadonlyArray<LandscapeShow> | Unavailable> {
  'use cache';
  cacheTag(`landing:decade:${slug}`);
  const discover = await getDiscoverShows(landscapeQuery(slug));
  if (isUnavailable(discover)) {
    cacheLife('unavailable');
    return discover;
  }
  const top = discover.items.slice(0, LANDSCAPE_SIZE);
  const summaries =
    top.length > 0
      ? await getShowSummaries(summaryIds(top.map((show) => show.id)))
      : {};
  if (isUnavailable(summaries)) {
    cacheLife('unavailable');
    return summaries;
  }
  cacheLife('medium');
  return buildLandscape(top, summaries);
}

/**
 * The page's rows top to bottom, for "neighbours never repeat": the
 * treemap's shows, then Missed by most (which drops them).
 */
export const decadeRows = (slug: string): ReadonlyArray<RowLoader> => [
  () => discoverRowSource(landscapeQuery(slug), { first: LANDSCAPE_SIZE }),
  () => discoverRowSource(missedQuery(slug)),
];
