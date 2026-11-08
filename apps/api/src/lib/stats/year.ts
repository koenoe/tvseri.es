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
import { buildPosterImageUrl } from '@tvseri.es/utils';
import { getISOWeek, getISOWeekYear } from 'date-fns';

import {
  aggregateCountries,
  aggregateGenres,
  aggregateProviders,
} from './aggregations';
import { getStatsCaches, setStatsCache } from './cache';
import { calculateMetrics, getUniqueSeriesIds } from './calculations';
import { getWatchedItemsForYear, type StatsWatchedItem } from './data';
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
    const date = new Date(item.watchedAt);
    const isoWeekYear = getISOWeekYear(date);
    let weekIndex: number;

    if (isoWeekYear < year) {
      // Date is in last ISO week of previous year (e.g., Jan 1-2 might be week 52 of prev year)
      // Put in visual week 1
      weekIndex = 0;
    } else if (isoWeekYear > year) {
      // Date is in first ISO week of next year (e.g., Dec 29-31 might be week 1 of next year)
      // Put in visual week 53
      weekIndex = 52;
    } else {
      // Normal case: ISO week year matches display year
      weekIndex = getISOWeek(date) - 1;
    }

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

const SEGMENTS = {
  countries: async (items: ReadonlyArray<StatsWatchedItem>) =>
    aggregateCountries(await fetchStatsSeriesMeta(getUniqueSeriesIds(items))),
  genres: async (items: ReadonlyArray<StatsWatchedItem>) =>
    aggregateGenres(await fetchStatsSeriesMeta(getUniqueSeriesIds(items))),
  providers: (items: ReadonlyArray<StatsWatchedItem>) =>
    aggregateProviders(items),
  'watched-series': (items: ReadonlyArray<StatsWatchedItem>) =>
    calculateWatchedSeries(items),
  weekly: (items: ReadonlyArray<StatsWatchedItem>, year: number) =>
    calculateWeekly(items, year),
};

export type YearSegment = keyof typeof SEGMENTS;

/**
 * Computes one segment from the year's watched items and caches it
 * (best-effort).
 */
export const computeYearSegment = async (
  userId: string,
  year: number,
  segment: YearSegment,
) => {
  const items = await getWatchedItemsForYear(userId, year);
  const result = await SEGMENTS[segment](items, year);

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
