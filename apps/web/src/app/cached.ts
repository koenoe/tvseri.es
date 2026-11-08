/**
 * Cached entry points for series, seasons and persons used across RSCs,
 * route handlers and server actions.
 *
 * `use cache` keys on the serialised arguments, so ids are normalised to
 * strings and options to primitives: `cachedTvSeries(123)` and
 * `cachedTvSeries('123')` share one entry. Concurrent calls with the same key
 * in one request are deduped by `use cache` itself.
 *
 * In-memory per instance on purpose: the API's CloudFront cache is the shared
 * layer behind it (cheaper than Vercel Runtime Cache, and survives deploys).
 */

import { cacheLife, cacheTag } from 'next/cache';
import { fetchPerson, fetchTvSeries, fetchTvSeriesSeason } from '@/lib/api';

/**
 * Narrow tag for what preferred images change (backdrop, colour, title
 * treatment), which only lives in the series object itself.
 */
export const seriesImagesCacheTag = (id: number | string) =>
  `series-images:${id}`;

async function fetchCachedTvSeries(id: string, includeImages: boolean) {
  'use cache';
  cacheLife('short');
  cacheTag(`series:${id}`, seriesImagesCacheTag(id));
  return fetchTvSeries(id, { includeImages });
}

async function fetchCachedTvSeriesSeason(id: string, seasonNumber: string) {
  'use cache';
  cacheLife('short');
  cacheTag(`series:${id}`);
  return fetchTvSeriesSeason(id, seasonNumber);
}

async function fetchCachedPerson(id: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`person:${id}`);
  return fetchPerson(id);
}

/**
 * Pass `{ includeImages: true }` wherever the images don't hurt, so callers
 * share the warm entry the /tv page uses.
 */
export const cachedTvSeries = (
  id: number | string,
  options?: Readonly<{ includeImages?: boolean }>,
) => fetchCachedTvSeries(String(id), options?.includeImages ?? false);

export const cachedTvSeriesSeason = (
  id: number | string,
  seasonNumber: number | string,
) => fetchCachedTvSeriesSeason(String(id), String(Number(seasonNumber)));

export const cachedPerson = (id: number | string) =>
  fetchCachedPerson(String(id));
