/**
 * Cached entry points for series, seasons, persons and users used across RSCs,
 * route handlers and server actions.
 *
 * `use cache` keys on the serialised arguments, so ids are normalised to
 * strings and options to primitives: `cachedTvSeries(123)` and
 * `cachedTvSeries('123')` share one entry. Concurrent calls with the same key
 * in one request are deduped by `use cache` itself.
 */

import { cacheLife, cacheTag } from 'next/cache';
import {
  fetchPerson,
  fetchTvSeries,
  fetchTvSeriesSeason,
  findUser,
} from '@/lib/api';

async function fetchCachedTvSeries(id: string, includeImages: boolean) {
  'use cache';
  cacheLife('short');
  cacheTag(`series:${id}`);
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

export const cachedTvSeries = (
  id: number | string,
  options?: Readonly<{ includeImages?: boolean }>,
) => fetchCachedTvSeries(String(id), options?.includeImages ?? false);

export const cachedTvSeriesSeason = (
  id: number | string,
  seasonNumber: number | string,
) => fetchCachedTvSeriesSeason(String(id), String(seasonNumber));

export const cachedPerson = (id: number | string) =>
  fetchCachedPerson(String(id));

/**
 * Not cached across requests (user data, and renames would need invalidation).
 * Repeated `cachedUser({ username })` calls within one render are deduped by
 * `apiFetch`'s per-request GET dedupe.
 */
export const cachedUser = findUser;
