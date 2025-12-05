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

export async function getStatsSummary(
  input: StatsInput,
): Promise<StatsSummary> {
  const result = (await apiFetch('/user/:id/stats/:year/summary', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsSummary;

  return result;
}

export async function getStatsFavoritesCount(
  input: StatsInput,
): Promise<StatsFavoritesCount> {
  const result = (await apiFetch('/user/:id/stats/:year/favorites-count', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsFavoritesCount;

  return result;
}

export async function getStatsSpotlight(
  input: StatsInput,
): Promise<StatsSpotlight> {
  const result = (await apiFetch('/user/:id/stats/:year/spotlight', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsSpotlight;

  return result;
}

export async function getStatsWeekly(
  input: StatsInput,
): Promise<StatsWeeklyItem[]> {
  const result = (await apiFetch('/user/:id/stats/:year/weekly', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsWeeklyItem[];

  return result;
}

export async function getStatsGenres(
  input: StatsInput,
): Promise<StatsGenreItem[]> {
  const result = (await apiFetch('/user/:id/stats/:year/genres', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsGenreItem[];

  return result;
}

export async function getStatsProviders(
  input: StatsInput,
): Promise<StatsProviderItem[]> {
  const result = (await apiFetch('/user/:id/stats/:year/providers', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsProviderItem[];

  return result;
}

export async function getStatsCountries(
  input: StatsInput,
): Promise<StatsCountries> {
  const result = (await apiFetch('/user/:id/stats/:year/countries', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsCountries;

  return result;
}

export async function getStatsWatchedSeries(
  input: StatsInput,
): Promise<StatsWatchedSeriesItem[]> {
  const result = (await apiFetch('/user/:id/stats/:year/watched-series', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as StatsWatchedSeriesItem[];

  return result;
}
