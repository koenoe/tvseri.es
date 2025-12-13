import { vValidator } from '@hono/valibot-validator';
import {
  MetricsRouteParamSchema,
  MetricsRouteQuerySchema,
  MetricsRoutesQuerySchema,
  type MetricsRoutesResponse,
  type WebVitalAggregate,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import {
  aggregateSummaries,
  buildPk,
  getDateRange,
  queryByPkAndPrefix,
  queryRouteTimeSeries,
} from './queries';

const app = new Hono<{ Variables: Variables }>();

/**
 * GET /metrics/web-vitals/routes
 *
 * List all routes with their Web Vitals metrics.
 * Supports cross-filtering by device and/or country.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - device: mobile | tablet | desktop (optional filter)
 * - country: US | GB | etc. (optional filter)
 * - sortBy: pageviews | score | LCP | INP | CLS (default: pageviews)
 * - sortDir: asc | desc (default: desc)
 * - limit: number (optional, for top N)
 */
app.get('/', vValidator('query', MetricsRoutesQuerySchema), async (c) => {
  const {
    country,
    days,
    device,
    limit,
    sortBy = 'pageviews',
    sortDir = 'desc',
  } = c.req.valid('query');
  const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

  const { dates, endDate, startDate } = getDateRange(numDays);

  // Fetch route items for each day with filters baked into pk
  const allRouteItems: WebVitalAggregate[] = [];
  await Promise.all(
    dates.map(async (date) => {
      const pk = buildPk(date, { country, device });
      const items = await queryByPkAndPrefix(pk, 'R#');
      allRouteItems.push(...items);
    }),
  );

  // Group by route and aggregate across days
  const routeMap = new Map<string, WebVitalAggregate[]>();
  for (const item of allRouteItems) {
    const route = item.sk.replace('R#', '');
    const existing = routeMap.get(route);
    if (existing) {
      existing.push(item);
    } else {
      routeMap.set(route, [item]);
    }
  }

  // Aggregate each route's data
  const routes: Array<{
    CLS: WebVitalAggregate['CLS'];
    FCP: WebVitalAggregate['FCP'];
    INP: WebVitalAggregate['INP'];
    LCP: WebVitalAggregate['LCP'];
    pageviews: number;
    route: string;
    score: number;
    TTFB: WebVitalAggregate['TTFB'];
  }> = [];

  for (const [route, items] of routeMap) {
    const aggregated = aggregateSummaries(items);
    if (aggregated) {
      routes.push({
        CLS: aggregated.CLS,
        FCP: aggregated.FCP,
        INP: aggregated.INP,
        LCP: aggregated.LCP,
        pageviews: aggregated.pageviews,
        route,
        score: aggregated.score,
        TTFB: aggregated.TTFB,
      });
    }
  }

  // Sort
  routes.sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortBy) {
      case 'score':
        aVal = a.score;
        bVal = b.score;
        break;
      case 'LCP':
        aVal = a.LCP.p75;
        bVal = b.LCP.p75;
        break;
      case 'INP':
        aVal = a.INP.p75;
        bVal = b.INP.p75;
        break;
      case 'CLS':
        aVal = a.CLS.p75;
        bVal = b.CLS.p75;
        break;
      default:
        aVal = a.pageviews;
        bVal = b.pageviews;
    }

    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Apply limit if provided
  const result = limit ? routes.slice(0, limit) : routes;

  const response: MetricsRoutesResponse = {
    endDate,
    routes: result,
    startDate,
    total: routes.length,
  };

  return c.json(response);
});

/**
 * GET /metrics/web-vitals/routes/:route
 *
 * Time-series for a specific route.
 * Uses GSI1 (RouteTimeIndex) for efficient queries.
 *
 * Path params:
 * - route: URL-encoded route pattern (e.g., /tv/[id])
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/:route',
  vValidator('param', MetricsRouteParamSchema),
  vValidator('query', MetricsRouteQuerySchema),
  async (c) => {
    const { route } = c.req.valid('param');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(Number(days) || 7, 1), 30);

    const decodedRoute = decodeURIComponent(route);
    const { endDate, startDate } = getDateRange(numDays);

    // Use GSI for efficient time-series query
    const items = await queryRouteTimeSeries(decodedRoute, startDate, endDate);

    // Sort by date for charting
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate for period summary
    const aggregated = aggregateSummaries(items);

    return c.json({
      aggregated,
      endDate,
      route: decodedRoute,
      series: items.map((item) => ({
        CLS: item.CLS,
        date: item.date,
        FCP: item.FCP,
        INP: item.INP,
        LCP: item.LCP,
        pageviews: item.pageviews,
        score: item.score,
        TTFB: item.TTFB,
      })),
      startDate,
    });
  },
);

export default app;
