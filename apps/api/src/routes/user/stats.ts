/**
 * Stats API endpoints.
 * All business logic is delegated to lib/stats modules.
 */

import type { StatsFavoritesCount, StatsSpotlight } from '@tvseri.es/schemas';
import { buildStillImageUrl } from '@tvseri.es/utils';
import { type Context, Hono } from 'hono';
import { getListItemsCount } from '@/lib/db/list';
import { getWatched } from '@/lib/db/watched';
import {
  computeYearSegment,
  getStatsCache,
  getSummaryMetrics,
  setStatsCache,
  type YearSegment,
} from '@/lib/stats';
import { fetchTvSeries } from '@/lib/tmdb';
import { cacheHeader } from '@/utils/cacheHeader';

import { type UserVariables, user, yearMiddleware } from './middleware';

type Variables = {
  year: number;
} & UserVariables;

const STATS_CACHE_HEADER = cacheHeader('stats');

const app = new Hono<{ Variables: Variables }>();

const statsJson = (c: Context, value: unknown) => {
  c.header('Cache-Control', STATS_CACHE_HEADER);
  return c.json(value);
};

// Summary endpoint: totalRuntime, episodeCount, seriesCount, longestStreak, avgPerDay
app.get('/:id/stats/:year/summary', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');

  // Read from the per-year `metrics` cache (see getSummaryMetrics)
  return statsJson(c, await getSummaryMetrics(userId, c.get('year')));
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
      c.header('Cache-Control', STATS_CACHE_HEADER);
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
    c.header('Cache-Control', STATS_CACHE_HEADER);
    return c.json(result);
  },
);

// First and last watch spotlight
app.get('/:id/stats/:year/spotlight', user(), yearMiddleware(), async (c) => {
  const { id: userId } = c.get('user');
  const year = c.get('year');

  const cached = await getStatsCache<StatsSpotlight>(userId, year, 'spotlight');
  if (cached) {
    c.header('Cache-Control', STATS_CACHE_HEADER);
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

    const tvSeries = await fetchTvSeries(item.seriesId, {
      includeImages: true,
    });
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
        backdropColor: tvSeries.backdropColor ?? null,
        backdropImage: tvSeries.backdropImage ?? null,
        id: tvSeries.id,
        posterImage: tvSeries.posterImage ?? null,
        slug: tvSeries.slug,
        title: tvSeries.title,
        titleTreatmentImage: tvSeries.titleTreatmentImage ?? null,
      },
      watchedAt: item.watchedAt,
      watchProviderLogo: item.watchProviderLogoImage ?? null,
    };
  };

  const [first, last] = await Promise.all([
    enrichSpotlight(firstItem),
    enrichSpotlight(lastItem),
  ]);

  const result = { first, last };

  await setStatsCache(userId, year, 'spotlight', result);
  c.header('Cache-Control', STATS_CACHE_HEADER);
  return c.json(result);
});

/**
 * A segment derived from the year's watched items. On a miss it computes and
 * caches only itself (see computeYearSegment).
 */
const yearSegment =
  (segment: YearSegment) => async (c: Context<{ Variables: Variables }>) => {
    const { id: userId } = c.get('user');
    const year = c.get('year');

    const cached = await getStatsCache(userId, year, segment);
    if (cached) {
      return statsJson(c, cached);
    }

    return statsJson(c, await computeYearSegment(userId, year, segment));
  };

// Weekly watch data
app.get(
  '/:id/stats/:year/weekly',
  user(),
  yearMiddleware(),
  yearSegment('weekly'),
);

// Genre stats
app.get(
  '/:id/stats/:year/genres',
  user(),
  yearMiddleware(),
  yearSegment('genres'),
);

// Provider/streaming service stats
app.get(
  '/:id/stats/:year/providers',
  user(),
  yearMiddleware(),
  yearSegment('providers'),
);

// Country stats
app.get(
  '/:id/stats/:year/countries',
  user(),
  yearMiddleware(),
  yearSegment('countries'),
);

// Watched series list (unique series with poster info)
app.get(
  '/:id/stats/:year/watched-series',
  user(),
  yearMiddleware(),
  yearSegment('watched-series'),
);

export default app;
