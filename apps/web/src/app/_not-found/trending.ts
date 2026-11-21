import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { cache } from 'react';

import type { NotFoundShow } from '@/components/ui/error/notFoundShow';
import { cacheLifeFor, isUnavailable } from '@/lib/cache/unavailable';
import { readTrendingShows } from '@/lib/series/trending';

/** Trims the API's shows to what the 404 draws (posters + Pick one). */
export function toNotFoundShows(
  series: ReadonlyArray<TvSeries>,
): NotFoundShow[] {
  return series
    .filter((show) => show.posterImage)
    .map(({ id, posterImage, slug, title }) => ({
      id,
      poster: posterImage,
      slug,
      title,
    }));
}

/**
 * The trending shows for the 404's posters and Pick one for me, cached so
 * the 404 stays prerendered. Every page's payload carries the 404 boundary
 * and its cache tags, so this read is tagged nothing: Home's `home` tag here
 * would make Home's admin refresh expire every page. It turns over on
 * `short` (an outage on `unavailable`). Empty when the API is down or not
 * configured (a local build): the 404 then leaves both out.
 */
async function cachedTrending(): Promise<NotFoundShow[]> {
  'use cache';
  const shows = await readTrendingShows();
  cacheLifeFor('short', shows);
  return isUnavailable(shows) ? [] : toNotFoundShows(shows);
}

/**
 * Once per render: the root and `(site)` 404 boundaries both render into a
 * site page's payload, and one array lets the payload carry it once.
 */
export const loadTrending = cache(cachedTrending);
