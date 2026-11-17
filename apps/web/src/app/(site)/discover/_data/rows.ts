import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { cacheTag } from 'next/cache';

import {
  getLandingCounts,
  landingCountsKey,
} from '@/app/(site)/_discover/data/counts';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { type RankedShow, rankedShows } from './allTime';
import { GENRE_TILES } from './hubTiles';

/**
 * All-time favourites: the owner's MDBList list, numbered, in its own
 * order. The same API read (and CDN key) as Home's pick deck;
 * `short` like it and the API's header, as the list is refreshed every 12
 * hours. Only the ranked fields are cached.
 */
export async function getAllTimeFavourites(): Promise<
  ReadonlyArray<RankedShow> | Unavailable
> {
  'use cache';
  cacheTag(tags.discover);
  const list = await tryApi(() =>
    apiFetch<TvSeries[]>('/collection/top-rated'),
  );
  cacheLifeFor('short', list);
  if (isUnavailable(list)) {
    return list;
  }
  return rankedShows(list);
}

/** The Genres block's counts, keyed by landing slug */
export const getGenreCounts = () =>
  getLandingCounts(
    'genre',
    landingCountsKey(GENRE_TILES.map((genre) => genre.slug)),
  );
