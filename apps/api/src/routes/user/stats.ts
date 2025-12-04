/**
 * Stats API endpoints.
 * All business logic is delegated to lib/stats modules.
 */

import type {
  StatsFavoritesCount,
  StatsSpotlight,
  StatsSummary,
} from '@tvseri.es/schemas';
import { buildPosterImageUrl, buildStillImageUrl } from '@tvseri.es/utils';
import { getISOWeek } from 'date-fns';
import { Hono } from 'hono';

import { getListItemsCount } from '@/lib/db/list';
import { getWatched } from '@/lib/db/watched';
import {
  aggregateCountries,
  aggregateGenres,
  aggregateProviders,
  calculateMetrics,
  getStatsCache,
  getUniqueSeriesIds,
  getWatchedItemsForYear,
  setStatsCache,
} from '@/lib/stats';
import { fetchTvSeries } from '@/lib/tmdb';

import { type UserVariables, user, yearMiddleware } from './middleware';

type Variables = {
  year: number;
} & UserVariables;

const CACHE_HEADER =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

const app = new Hono<{ Variables: Variables }>();

// Summary endpoint: totalRuntime, episodeCount, seriesCount, longestStreak, avgPerDay
app.get('/:id/stats/:year/summary', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');
  const year = c.get('year');

  const cached = await getStatsCache<StatsSummary>(userId, year, 'summary');
  if (cached) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(cached);
  }

  const [currentItems, previousItems] = await Promise.all([
    getWatchedItemsForYear(userId, year),
    getWatchedItemsForYear(userId, year - 1),
  ]);

  const result = {
    current: calculateMetrics(currentItems),
    previous: calculateMetrics(previousItems),
  };

  await setStatsCache(userId, year, 'summary', result);
  c.header('Cache-Control', CACHE_HEADER);
  return c.json(result);
});

// Favorites count endpoint
app.get(
  '/:id/stats/:year/favorites-count',
  user(),
  yearMiddleware(),
  async (c) => {
    const { id: userId } = c.get('user');
    const year = c.get('year');

    const cached = await getStatsCache<StatsFavoritesCount>(
      userId,
      year,
      'favorites-count',
    );
    if (cached) {
      c.header('Cache-Control', CACHE_HEADER);
      return c.json(cached);
    }

    const [current, previous] = await Promise.all([
      getListItemsCount({
        endDate: new Date(`${year}-12-31T23:59:59.999Z`),
        listId: 'FAVORITES',
        startDate: new Date(`${year}-01-01T00:00:00.000Z`),
        userId,
      }),
      getListItemsCount({
        endDate: new Date(`${year - 1}-12-31T23:59:59.999Z`),
        listId: 'FAVORITES',
        startDate: new Date(`${year - 1}-01-01T00:00:00.000Z`),
        userId,
      }),
    ]);

    const result = { current, previous };

    await setStatsCache(userId, year, 'favorites-count', result);
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(result);
  },
);

// First and last watch spotlight
app.get('/:id/stats/:year/spotlight', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');
  const year = c.get('year');

  const cached = await getStatsCache<StatsSpotlight>(userId, year, 'spotlight');
  if (cached) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(cached);
  }

  const [firstResult, lastResult] = await Promise.all([
    getWatched({
      endDate: new Date(`${year}-12-31T23:59:59.999Z`),
      options: { limit: 1, sortDirection: 'asc' },
      startDate: new Date(`${year}-01-01T00:00:00.000Z`),
      userId,
    }),
    getWatched({
      endDate: new Date(`${year}-12-31T23:59:59.999Z`),
      options: { limit: 1, sortDirection: 'desc' },
      startDate: new Date(`${year}-01-01T00:00:00.000Z`),
      userId,
    }),
  ]);

  const firstItem = firstResult.items[0];
  const lastItem = lastResult.items[0];

  const enrichSpotlight = async (
    item: (typeof firstResult.items)[0] | undefined,
  ) => {
    if (!item) return null;

    const tvSeries = await fetchTvSeries(item.seriesId);
    if (!tvSeries) return null;

    return {
      episode: {
        episodeNumber: item.episodeNumber,
        runtime: item.runtime,
        seasonNumber: item.seasonNumber,
        stillImage: item.episodeStillPath
          ? buildStillImageUrl(item.episodeStillPath)
          : null,
        title: item.episodeTitle ?? `Episode ${item.episodeNumber}`,
      },
      tvSeries: {
        backdropImage: tvSeries.backdropPath
          ? `https://image.tmdb.org/t/p/w1280${tvSeries.backdropPath}`
          : null,
        id: tvSeries.id,
        posterImage: tvSeries.posterPath
          ? buildPosterImageUrl(tvSeries.posterPath)
          : null,
        slug: tvSeries.slug,
        title: tvSeries.title,
      },
      watchedAt: item.watchedAt,
    };
  };

  const [first, last] = await Promise.all([
    enrichSpotlight(firstItem),
    enrichSpotlight(lastItem),
  ]);

  const result = { first, last };

  await setStatsCache(userId, year, 'spotlight', result);
  c.header('Cache-Control', CACHE_HEADER);
  return c.json(result);
});

// Weekly watch data
app.get('/:id/stats/:year/weekly', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');
  const year = c.get('year');

  const cached = await getStatsCache(userId, year, 'weekly');
  if (cached) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(cached);
  }

  const items = await getWatchedItemsForYear(userId, year);

  // Create 53 weeks of data
  const weekCounts = Array.from({ length: 53 }, (_, i) => ({
    episodes: 0,
    runtimeHours: 0,
    totalRuntime: 0,
    week: i + 1,
  }));

  items.forEach((item) => {
    const date = new Date(item.watchedAt);
    const weekNumber = getISOWeek(date);

    if (weekNumber <= 53) {
      weekCounts[weekNumber - 1]!.episodes += 1;
      weekCounts[weekNumber - 1]!.totalRuntime += item.runtime || 0;
    }
  });

  // Convert runtime to hours
  weekCounts.forEach((week) => {
    week.runtimeHours = Math.round((week.totalRuntime / 60) * 10) / 10;
  });

  await setStatsCache(userId, year, 'weekly', weekCounts);
  c.header('Cache-Control', CACHE_HEADER);
  return c.json(weekCounts);
});

// Genre stats
app.get('/:id/stats/:year/genres', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');
  const year = c.get('year');

  const cached = await getStatsCache(userId, year, 'genres');
  if (cached) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(cached);
  }

  const items = await getWatchedItemsForYear(userId, year);
  const uniqueSeriesIds = getUniqueSeriesIds(items);

  if (uniqueSeriesIds.length === 0) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json([]);
  }

  const seriesWithGenres = await Promise.all(
    uniqueSeriesIds.map((id) => fetchTvSeries(id)),
  );

  const result = aggregateGenres(seriesWithGenres);

  await setStatsCache(userId, year, 'genres', result);
  c.header('Cache-Control', CACHE_HEADER);
  return c.json(result);
});

// Provider/streaming service stats
app.get('/:id/stats/:year/providers', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');
  const year = c.get('year');

  const cached = await getStatsCache(userId, year, 'providers');
  if (cached) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(cached);
  }

  const items = await getWatchedItemsForYear(userId, year);
  const result = await aggregateProviders(items);

  await setStatsCache(userId, year, 'providers', result);
  c.header('Cache-Control', CACHE_HEADER);
  return c.json(result);
});

// Country stats
app.get('/:id/stats/:year/countries', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');
  const year = c.get('year');

  const cached = await getStatsCache(userId, year, 'countries');
  if (cached) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(cached);
  }

  const items = await getWatchedItemsForYear(userId, year);
  const uniqueSeriesIds = getUniqueSeriesIds(items);

  if (uniqueSeriesIds.length === 0) {
    c.header('Cache-Control', CACHE_HEADER);
    return c.json({});
  }

  const seriesList = await Promise.all(
    uniqueSeriesIds.map((id) => fetchTvSeries(id)),
  );

  const result = aggregateCountries(seriesList);

  await setStatsCache(userId, year, 'countries', result);
  c.header('Cache-Control', CACHE_HEADER);
  return c.json(result);
});

// Watched series list (unique series with poster info)
app.get(
  '/:id/stats/:year/watched-series',
  user(),
  yearMiddleware(),
  async (c) => {
    const { id: userId } = c.get('user');
    const year = c.get('year');

    const cached = await getStatsCache(userId, year, 'watched-series');
    if (cached) {
      c.header('Cache-Control', CACHE_HEADER);
      return c.json(cached);
    }

    const items = await getWatchedItemsForYear(userId, year);

    // Get unique series, keeping the first occurrence (most recent watch)
    const uniqueItems = [
      ...new Map(items.map((item) => [item.seriesId, item])).values(),
    ];

    const result = uniqueItems.map((item) => ({
      id: item.seriesId,
      posterImage: item.posterPath
        ? buildPosterImageUrl(item.posterPath)
        : null,
      slug: item.slug,
      title: item.title,
    }));

    await setStatsCache(userId, year, 'watched-series', result);
    c.header('Cache-Control', CACHE_HEADER);
    return c.json(result);
  },
);

export default app;
