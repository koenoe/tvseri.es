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

import { apiFetch } from './client';

type StatsInput = Readonly<{
  userId: string;
  year: number | string;
}>;

// Stats are intentionally stale (24h at the API) and not cached here. Repeated
// calls within one render (e.g. summary ×5) are deduped by apiFetch; `year` is
// stringified so `2024` and `'2024'` hit the same dedupe key.
function getStats<T>(segment: string, { userId, year }: StatsInput) {
  return apiFetch<T>(`/user/:id/stats/:year/${segment}`, {
    params: {
      id: userId,
      year: String(year),
    },
  });
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
