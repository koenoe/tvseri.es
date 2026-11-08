import type {
  StatsCountries,
  StatsFavoritesCount,
  StatsGenreItem,
  StatsProviderItem,
  StatsSpotlight,
  StatsSummary,
  StatsWatchedSeriesItem,
  StatsWeeklyItem,
} from '@tvseri.es/schemas';

import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';
import { userCacheTag } from './users';

type StatsInput = Readonly<{
  userId: string;
  year: number | string;
}>;

/**
 * Public stats: cached per user, year and segment with the `stats` profile
 * (24h fresh, then served stale while revalidating), so the stats page can be
 * an ISR entry per URL. Concurrent identical calls (e.g. summary ×5) share
 * one entry. `year` is stringified so `2024` and `'2024'` share a key.
 * The `user:<id>` tag is only invalidated on a username change; new watches
 * show up when the entry goes stale (stats are intentionally up to 24h old).
 */
async function fetchCachedStats(segment: string, userId: string, year: string) {
  'use cache';
  cacheLife('stats');
  cacheTag(userCacheTag(userId));
  return apiFetch<unknown>(`/user/:id/stats/:year/${segment}`, {
    params: {
      id: userId,
      year,
    },
  });
}

function getStats<T>(segment: string, { userId, year }: StatsInput) {
  return fetchCachedStats(segment, userId, String(year)) as Promise<T>;
}

export const getStatsSummary = (input: StatsInput) =>
  getStats<StatsSummary>('summary', input);

export const getStatsFavoritesCount = (input: StatsInput) =>
  getStats<StatsFavoritesCount>('favorites-count', input);

export const getStatsSpotlight = (input: StatsInput) =>
  getStats<StatsSpotlight>('spotlight', input);

export const getStatsWeekly = (input: StatsInput) =>
  getStats<StatsWeeklyItem[]>('weekly', input);

export const getStatsGenres = (input: StatsInput) =>
  getStats<StatsGenreItem[]>('genres', input);

export const getStatsProviders = (input: StatsInput) =>
  getStats<StatsProviderItem[]>('providers', input);

export const getStatsCountries = (input: StatsInput) =>
  getStats<StatsCountries>('countries', input);

export const getStatsWatchedSeries = (input: StatsInput) =>
  getStats<StatsWatchedSeriesItem[]>('watched-series', input);
