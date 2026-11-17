import 'server-only';

import {
  type DiscoverQuery,
  normalizeDiscoverQuery,
  type TvSeries,
} from '@tvseri.es/schemas';
import { cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

import { type TileShow, toTileShow } from './tileShow';

type DiscoverResponse = Readonly<{
  items: ReadonlyArray<TvSeries>;
  totalNumberOfItems: number;
  totalNumberOfPages: number;
}>;

export type DiscoverShows = Readonly<{
  items: ReadonlyArray<TileShow>;
  /** TMDB's total for the query (`total_results`) */
  total: number;
  pages: number;
}>;

/**
 * The canonical query string for a discover filter: the same
 * function the API uses, so equal filters share one web cache entry and one
 * API CDN key. Pass the result to `getDiscoverShows`.
 */
export const discoverQueryString = (
  filter: Readonly<Partial<Record<keyof DiscoverQuery, string>>>,
): string => normalizeDiscoverQuery(filter).queryString.replace(/^\?/, '');

/**
 * One page of `GET /discover` as tiles (cached `medium`, like the API).
 * Takes the canonical query string (`discoverQueryString`) so the cache key
 * is a primitive. `Unavailable` when the API fails. `life: 'short'` for rows that change daily (a landing's
 * Trending row: TMDB popularity).
 */
export async function getDiscoverShows(
  queryString: string,
  page = 1,
  life: 'medium' | 'short' = 'medium',
): Promise<DiscoverShows | Unavailable> {
  'use cache';
  cacheTag(tags.discover);

  const query = Object.fromEntries(new URLSearchParams(queryString));
  const response = await tryApi(() =>
    apiFetch<DiscoverResponse>('/discover', {
      query: { ...query, page: page > 1 ? page : undefined },
    }),
  );
  cacheLifeFor(life, response);
  if (isUnavailable(response)) {
    return response;
  }
  // TMDB repeats a show across pages now and then: keep the first.
  const seen = new Set<number>();
  return {
    items: response.items
      .filter((series) => !seen.has(series.id) && seen.add(series.id))
      .map(toTileShow),
    pages: response.totalNumberOfPages,
    total: response.totalNumberOfItems,
  };
}
