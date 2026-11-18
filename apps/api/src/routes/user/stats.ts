import type { StatsYears, StatsZone } from '@tvseri.es/schemas';
import { type Context, Hono } from 'hono';
import {
  computeYearSegment,
  getAllTimeStats,
  getFavoritesCount,
  getStatsCache,
  getSummaryMetrics,
  getYearSpotlight,
  type YearSegment,
} from '@/lib/stats';
import { timeZoneForCountry } from '@/lib/stats/timeZone';
import { cacheHeader, PRIVATE_NO_STORE } from '@/utils/cacheHeader';

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

app.get(
  '/:id/stats/:year/favorites-count',
  user(),
  yearMiddleware(),
  async (c) =>
    statsJson(c, await getFavoritesCount(c.get('user').id, c.get('year'))),
);

// First and last watch of the year
app.get('/:id/stats/:year/spotlight', user(), yearMiddleware(), async (c) =>
  statsJson(c, await getYearSpotlight(c.get('user').id, c.get('year'))),
);

const isInZone = (value: unknown, timeZone: string) =>
  typeof value !== 'object' ||
  value === null ||
  !('timeZone' in value) ||
  value.timeZone === timeZone;

/**
 * A segment derived from the year's watched items. On a miss it computes and
 * caches only itself (see computeYearSegment).
 */
const yearSegment =
  (segment: YearSegment) => async (c: Context<{ Variables: Variables }>) => {
    const { country, id: userId } = c.get('user');
    const year = c.get('year');
    const timeZone = timeZoneForCountry(country);

    const cached = await getStatsCache(userId, year, segment);
    // A segment counted in a zone (`daily`, `when`) is stale once the user's
    // country moved them to another one
    if (cached && isInZone(cached, timeZone)) {
      return statsJson(c, cached);
    }

    return statsJson(
      c,
      await computeYearSegment({ timeZone, userId }, year, segment),
    );
  };

app.get(
  '/:id/stats/:year/weekly',
  user(),
  yearMiddleware(),
  yearSegment('weekly'),
);

app.get(
  '/:id/stats/:year/genres',
  user(),
  yearMiddleware(),
  yearSegment('genres'),
);

app.get(
  '/:id/stats/:year/providers',
  user(),
  yearMiddleware(),
  yearSegment('providers'),
);

app.get(
  '/:id/stats/:year/countries',
  user(),
  yearMiddleware(),
  yearSegment('countries'),
);

app.get(
  '/:id/stats/:year/watched-series',
  user(),
  yearMiddleware(),
  yearSegment('watched-series'),
);

// The stats page
app.get(
  '/:id/stats/:year/shows',
  user(),
  yearMiddleware(),
  yearSegment('shows'),
);

app.get(
  '/:id/stats/:year/finished',
  user(),
  yearMiddleware(),
  yearSegment('finished'),
);

app.get(
  '/:id/stats/:year/daily',
  user(),
  yearMiddleware(),
  yearSegment('daily'),
);

app.get('/:id/stats/:year/when', user(), yearMiddleware(), yearSegment('when'));

app.get(
  '/:id/stats/:year/new-or-back',
  user(),
  yearMiddleware(),
  yearSegment('new-or-back'),
);

// The Years submenu: years with watches and their episode counts
app.get('/:id/stats/years', user(), async (c) => {
  const { country, id: userId } = c.get('user');
  const { timeZone, undated, years } = await getAllTimeStats(
    userId,
    timeZoneForCountry(country),
  );
  // Current within seconds (like the sidebar counts): never kept by the
  // CDN; computed per request (cached until the next mark in the Cache
  // table)
  c.header('Cache-Control', PRIVATE_NO_STORE);
  return c.json({ timeZone, undated, years } satisfies StatsYears);
});

// The zone the user's stats count in (as `/stats/years` names it), so
// History can draw its local days without waiting on that read. No
// Cache-Control: CloudFront never stores it
app.get('/:id/stats/zone', user(), (c) =>
  c.json({
    timeZone: timeZoneForCountry(c.get('user').country),
  } satisfies StatsZone),
);

export default app;
