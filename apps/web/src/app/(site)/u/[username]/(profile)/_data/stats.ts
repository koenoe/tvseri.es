import 'server-only';

import type {
  StatsGenreItem,
  StatsProviderItem,
  StatsSummary,
  StatsWeeklyItem,
} from '@tvseri.es/schemas';

import {
  getGenres,
  getProviders,
  getSummary,
  getWeekly,
} from '@/app/(site)/u/[username]/stats/[year]/_data/loaders';
import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

/** What the sidebar's "{year} so far" needs */
export type YearSoFarStats = Readonly<{
  episodes: number;
  /** Minutes */
  runtime: number;
  /** Episodes per ISO week, week 1 first */
  weeks: ReadonlyArray<number>;
  /** Most watched first, at most two */
  genres: ReadonlyArray<string>;
  /** The most watched service, if any */
  provider: string | null;
}>;

const TOP_GENRES = 2;

const byCount = <T extends Readonly<{ count: number }>>(a: T, b: T) =>
  b.count - a.count;

const toYearSoFar = (
  summary: StatsSummary,
  weekly: ReadonlyArray<StatsWeeklyItem>,
  genres: ReadonlyArray<StatsGenreItem>,
  providers: ReadonlyArray<StatsProviderItem>,
): YearSoFarStats => ({
  episodes: summary.current.episodeCount,
  genres: [...genres]
    .sort(byCount)
    .slice(0, TOP_GENRES)
    .map((item) => item.genre),
  provider: [...providers].sort(byCount)[0]?.name ?? null,
  runtime: summary.current.totalRuntime,
  weeks: [...weekly]
    .sort((a, b) => a.week - b.week)
    .map((item) => item.episodes),
});

/**
 * One person's year for the sidebar: the Stats page's own cached reads of
 * the year (summary, weekly, genres, providers), so both pages ask the API
 * the same four URLs and its CDN keeps one copy. Public data only. An
 * outage of any of them is `Unavailable`.
 */
export async function loadYearSoFar(
  userId: string,
  year: number,
): Promise<YearSoFarStats | Unavailable> {
  const [summary, weekly, genres, providers] = await Promise.all([
    getSummary(userId, year),
    getWeekly(userId, year),
    getGenres(userId, year),
    getProviders(userId, year),
  ]);
  if (isUnavailable(summary)) {
    return summary;
  }
  if (isUnavailable(weekly)) {
    return weekly;
  }
  if (isUnavailable(genres)) {
    return genres;
  }
  if (isUnavailable(providers)) {
    return providers;
  }
  return toYearSoFar(summary, weekly, genres, providers);
}
