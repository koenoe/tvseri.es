/**
 * The stats segments derived from one year's watched items. On a miss each
 * segment computes and caches only its own result: the segments are requested
 * concurrently (separate Lambdas), so filling the others here would multiply
 * the work and the writes.
 */

import type {
  StatsMetrics,
  StatsWatchedSeriesItem,
  StatsWeeklyItem,
} from '@tvseri.es/schemas';
import { buildPosterImageUrl, yearWeekIndex } from '@tvseri.es/utils';

import { getAllListItems } from '@/lib/db/list';

import {
  aggregateCountries,
  aggregateGenres,
  aggregateProviders,
} from './aggregations';
import { getAllTimeStats } from './allTime';
import { getStatsCaches, setStatsCache } from './cache';
import { calculateMetrics, getUniqueSeriesIds } from './calculations';
import {
  getWatchedItemsForLocalYear,
  getWatchedItemsForYear,
  type StatsWatchedItem,
  utcYear,
} from './data';
import {
  calculateDaily,
  calculateFinished,
  calculateNewOrBack,
  calculateShows,
  calculateWhen,
} from './segments';
import { fetchStatsSeriesMeta } from './seriesMeta';

const calculateWeekly = (
  items: ReadonlyArray<StatsWatchedItem>,
  year: number,
): StatsWeeklyItem[] => {
  // Create 53 weeks of data
  const weekCounts = Array.from({ length: 53 }, (_, i) => ({
    episodes: 0,
    runtimeHours: 0,
    totalRuntime: 0,
    week: i + 1,
  }));

  items.forEach((item) => {
    const weekIndex = yearWeekIndex(item.watchedAt, year);

    if (weekIndex >= 0 && weekIndex < 53) {
      weekCounts[weekIndex]!.episodes += 1;
      weekCounts[weekIndex]!.totalRuntime += item.runtime || 0;
    }
  });

  // Convert runtime to hours
  weekCounts.forEach((week) => {
    week.runtimeHours = Math.round((week.totalRuntime / 60) * 10) / 10;
  });

  return weekCounts;
};

// Unique series with poster info
const calculateWatchedSeries = (
  items: ReadonlyArray<StatsWatchedItem>,
): StatsWatchedSeriesItem[] => {
  const uniqueItems = [
    ...new Map(items.map((item) => [item.seriesId, item])).values(),
  ];

  return uniqueItems.map((item) => ({
    id: item.seriesId,
    posterImage: item.posterPath ? buildPosterImageUrl(item.posterPath) : null,
    slug: item.slug,
    title: item.title,
  }));
};

/** What a segment is computed from */
type SegmentInput = Readonly<{
  /** The year's watches (UTC year), read only by the segments that use them */
  load: () => Promise<StatsWatchedItem[]>;
  /** The user's zone (from their country): `when` and the days of `daily` */
  timeZone: string;
  userId: string;
  year: number;
}>;

const SEGMENTS = {
  countries: async ({ load }: SegmentInput) =>
    aggregateCountries(
      await fetchStatsSeriesMeta(getUniqueSeriesIds(await load())),
    ),
  // Its own read: the year's days are local days (getWatchedItemsForLocalYear)
  daily: async ({ timeZone, userId, year }: SegmentInput) =>
    calculateDaily(
      await getWatchedItemsForLocalYear(userId, year, timeZone),
      timeZone,
    ),
  finished: async ({ load, userId, year }: SegmentInput) => {
    const [items, finishedItems] = await Promise.all([
      load(),
      getAllListItems({ ...utcYear(year), listId: 'WATCHED', userId }),
    ]);
    return calculateFinished(items, finishedItems);
  },
  genres: async ({ load }: SegmentInput) =>
    aggregateGenres(
      await fetchStatsSeriesMeta(getUniqueSeriesIds(await load())),
    ),
  'new-or-back': async ({ load, timeZone, userId, year }: SegmentInput) => {
    const [items, allTime] = await Promise.all([
      load(),
      getAllTimeStats(userId, timeZone),
    ]);
    return calculateNewOrBack(items, new Map(allTime.firstWatch), year);
  },
  providers: async ({ load }: SegmentInput) => aggregateProviders(await load()),
  shows: async ({ load, year }: SegmentInput) =>
    calculateShows(await load(), year),
  'watched-series': async ({ load }: SegmentInput) =>
    calculateWatchedSeries(await load()),
  weekly: async ({ load, year }: SegmentInput) =>
    calculateWeekly(await load(), year),
  when: async ({ load, timeZone }: SegmentInput) =>
    calculateWhen(await load(), timeZone),
};

export type YearSegment = keyof typeof SEGMENTS;

/**
 * Computes one segment from the year's watched items and caches it
 * (best-effort). `timeZone`: the user's (`timeZoneForCountry`), which the
 * route already knows from the user it read.
 */
export const computeYearSegment = async (
  { timeZone, userId }: Readonly<{ timeZone: string; userId: string }>,
  year: number,
  segment: YearSegment,
) => {
  const result = await SEGMENTS[segment]({
    load: () => getWatchedItemsForYear(userId, year),
    timeZone,
    userId,
    year,
  });

  await setStatsCache(userId, year, segment, result);
  return result;
};

/**
 * A cached StatsMetrics with zero runtime but watched episodes comes from
 * before runtimes were backfilled: recompute it.
 */
const isStaleMetrics = (metrics: StatsMetrics | null | undefined) =>
  metrics?.totalRuntime === 0 && metrics.episodeCount > 0;

const isUsableMetrics = (
  metrics: StatsMetrics | null | undefined,
): metrics is StatsMetrics => !!metrics && !isStaleMetrics(metrics);

const computeMetrics = async (userId: string, year: number) => {
  const items = await getWatchedItemsForYear(userId, year);
  const metrics = calculateMetrics(items, year);

  await setStatsCache(userId, year, 'metrics', metrics);
  return metrics;
};

/**
 * StatsMetrics for this year and last year (the summary), each from its own
 * per-year cache key when present; a missing year computes and caches only
 * its metrics.
 */
export const getSummaryMetrics = async (userId: string, year: number) => {
  const [cachedCurrent, cachedPrevious] = await getStatsCaches<StatsMetrics>(
    [
      [year, 'metrics'],
      [year - 1, 'metrics'],
    ],
    userId,
  );

  const [current, previous] = await Promise.all([
    isUsableMetrics(cachedCurrent)
      ? cachedCurrent
      : computeMetrics(userId, year),
    isUsableMetrics(cachedPrevious)
      ? cachedPrevious
      : computeMetrics(userId, year - 1),
  ]);

  return { current, previous };
};
