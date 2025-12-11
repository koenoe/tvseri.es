import { vValidator } from '@hono/valibot-validator';
import {
  type ApiMetricAggregate,
  ApiMetricsEndpointParamSchema,
  ApiMetricsEndpointsQuerySchema,
  ApiMetricsPlatformsQuerySchema,
  ApiMetricsStatusQuerySchema,
  ApiMetricsSummaryQuerySchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import type { Variables } from '@/middleware/auth';

import {
  aggregateSummaries,
  buildPk,
  getDateRange,
  queryByPkAndPrefix,
  queryEndpointTimeSeries,
  queryPlatformTimeSeries,
  queryStatusTimeSeries,
} from './queries';

const app = new Hono<{ Variables: Variables }>();

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /metrics/api/summary
 *
 * Main API metrics dashboard. Returns:
 * - Overall latency percentiles, error rate, cache hit rate
 * - Request count for the period
 * - Daily time-series for charting
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - platform: ios | android | web (optional filter)
 */
app.get('/', vValidator('query', ApiMetricsSummaryQuerySchema), async (c) => {
  const { days, platform } = c.req.valid('query');
  const numDays = Math.min(Math.max(days, 1), 30);

  const { dates, endDate, startDate } = getDateRange(numDays);

  // Fetch SUMMARY items for each day with optional platform filter
  const summaries: ApiMetricAggregate[] = [];
  await Promise.all(
    dates.map(async (date) => {
      const pk = buildPk(date, { platform });
      const items = await queryByPkAndPrefix(pk, 'SUMMARY');
      summaries.push(...items);
    }),
  );

  // Sort by date ascending for chart
  summaries.sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate all summaries into period totals
  const aggregated = aggregateSummaries(summaries);

  return c.json({
    aggregated,
    endDate,
    series: summaries.map((s) => ({
      date: s.date,
      errorRate: s.errorRate,
      latency: s.latency,
      requestCount: s.requestCount,
    })),
    startDate,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /metrics/api/endpoints
 *
 * List all endpoints (method + route) with their API metrics.
 * Supports filtering by platform.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - platform: ios | android | web (optional filter)
 * - sortBy: requests | errorRate | p75 | p99 (default: requests)
 * - sortDir: asc | desc (default: desc)
 * - limit: number (optional, for top N)
 */
app.get(
  '/endpoints',
  vValidator('query', ApiMetricsEndpointsQuerySchema),
  async (c) => {
    const {
      days,
      limit,
      platform,
      sortBy = 'requests',
      sortDir = 'desc',
    } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    // Fetch endpoint items for each day with optional platform filter
    const allEndpointItems: ApiMetricAggregate[] = [];
    await Promise.all(
      dates.map(async (date) => {
        const pk = buildPk(date, { platform });
        const items = await queryByPkAndPrefix(pk, 'E#');
        allEndpointItems.push(...items);
      }),
    );

    // Group by endpoint and aggregate across days
    const endpointMap = new Map<string, ApiMetricAggregate[]>();
    for (const item of allEndpointItems) {
      const endpoint = item.sk.replace('E#', '');
      const existing = endpointMap.get(endpoint);
      if (existing) {
        existing.push(item);
      } else {
        endpointMap.set(endpoint, [item]);
      }
    }

    // Aggregate each endpoint's data
    const endpoints: Array<{
      endpoint: string;
      errorRate: number;
      latency: ApiMetricAggregate['latency'];
      method: string;
      requestCount: number;
      route: string;
    }> = [];

    for (const [endpoint, items] of endpointMap) {
      const aggregated = aggregateSummaries(items);
      if (aggregated) {
        const [method, ...routeParts] = endpoint.split(' ');
        endpoints.push({
          endpoint,
          errorRate: aggregated.errorRate,
          latency: aggregated.latency,
          method: method as string,
          requestCount: aggregated.requestCount,
          route: routeParts.join(' '),
        });
      }
    }

    // Sort
    endpoints.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case 'errorRate':
          aVal = a.errorRate;
          bVal = b.errorRate;
          break;
        case 'p75':
          aVal = a.latency.p75;
          bVal = b.latency.p75;
          break;
        case 'p99':
          aVal = a.latency.p99;
          bVal = b.latency.p99;
          break;
        default:
          aVal = a.requestCount;
          bVal = b.requestCount;
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply limit if provided
    const result = limit ? endpoints.slice(0, limit) : endpoints;

    return c.json({
      endDate,
      endpoints: result,
      startDate,
      total: endpoints.length,
    });
  },
);

/**
 * GET /metrics/api/endpoints/:method/:route
 *
 * Time-series for a specific endpoint.
 * Uses GSI3 (EndpointTimeIndex) for efficient queries.
 *
 * Path params:
 * - method: GET | POST | PUT | DELETE | PATCH
 * - route: URL-encoded route pattern (e.g., /tv/[id])
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/endpoints/:method/:route',
  vValidator('param', ApiMetricsEndpointParamSchema),
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    const { method, route } = c.req.valid('param');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const decodedRoute = decodeURIComponent(route);
    const endpoint = `${method.toUpperCase()} ${decodedRoute}`;
    const { endDate, startDate } = getDateRange(numDays);

    // Use GSI for efficient time-series query
    const items = await queryEndpointTimeSeries(endpoint, startDate, endDate);

    // Sort by date for charting
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate for period summary
    const aggregated = aggregateSummaries(items);

    return c.json({
      aggregated,
      endDate,
      endpoint,
      method: method.toUpperCase(),
      route: decodedRoute,
      series: items.map((item) => ({
        date: item.date,
        errorRate: item.errorRate,
        latency: item.latency,
        requestCount: item.requestCount,
      })),
      startDate,
    });
  },
);

// ════════════════════════════════════════════════════════════════════════════
// STATUS CODES
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /metrics/api/status-codes
 *
 * List status code categories with their counts.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - platform: ios | android | web (optional filter)
 */
app.get(
  '/status-codes',
  vValidator('query', ApiMetricsStatusQuerySchema),
  async (c) => {
    const { days, platform } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    // Fetch status category items for each day
    const allStatusItems: ApiMetricAggregate[] = [];
    await Promise.all(
      dates.map(async (date) => {
        const pk = buildPk(date, { platform });
        const items = await queryByPkAndPrefix(pk, 'S#');
        allStatusItems.push(...items);
      }),
    );

    // Group by status category and aggregate
    const statusMap = new Map<string, ApiMetricAggregate[]>();
    for (const item of allStatusItems) {
      const status = item.sk.replace('S#', '');
      const existing = statusMap.get(status);
      if (existing) {
        existing.push(item);
      } else {
        statusMap.set(status, [item]);
      }
    }

    // Build response
    const statusCodes: Array<{
      category: string;
      latency: ApiMetricAggregate['latency'];
      requestCount: number;
    }> = [];

    for (const [category, items] of statusMap) {
      const aggregated = aggregateSummaries(items);
      if (aggregated) {
        statusCodes.push({
          category,
          latency: aggregated.latency,
          requestCount: aggregated.requestCount,
        });
      }
    }

    // Sort by request count descending
    statusCodes.sort((a, b) => b.requestCount - a.requestCount);

    return c.json({
      endDate,
      startDate,
      statusCodes,
    });
  },
);

/**
 * GET /metrics/api/status-codes/:category
 *
 * Time-series for a specific status category (2xx, 4xx, 5xx).
 * Uses GSI2 (StatusTimeIndex) for efficient queries.
 *
 * Path params:
 * - category: 2xx | 4xx | 5xx
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/status-codes/:category',
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    const category = c.req.param('category');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { endDate, startDate } = getDateRange(numDays);

    // Use GSI for efficient time-series query
    const items = await queryStatusTimeSeries(category, startDate, endDate);

    // Sort by date for charting
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate for period summary
    const aggregated = aggregateSummaries(items);

    return c.json({
      aggregated,
      category,
      endDate,
      series: items.map((item) => ({
        date: item.date,
        latency: item.latency,
        requestCount: item.requestCount,
      })),
      startDate,
    });
  },
);

// ════════════════════════════════════════════════════════════════════════════
// PLATFORMS
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /metrics/api/platforms
 *
 * List all platforms with their API metrics.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - sortBy: requests | errorRate | p75 | p99 (default: requests)
 * - sortDir: asc | desc (default: desc)
 */
app.get(
  '/platforms',
  vValidator('query', ApiMetricsPlatformsQuerySchema),
  async (c) => {
    const {
      days,
      sortBy = 'requests',
      sortDir = 'desc',
    } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    // Fetch platform items for each day (no filter - base pk only)
    const allPlatformItems: ApiMetricAggregate[] = [];
    await Promise.all(
      dates.map(async (date) => {
        const pk = buildPk(date);
        const items = await queryByPkAndPrefix(pk, 'P#');
        allPlatformItems.push(...items);
      }),
    );

    // Group by platform and aggregate across days
    const platformMap = new Map<string, ApiMetricAggregate[]>();
    for (const item of allPlatformItems) {
      const platform = item.sk.replace('P#', '');
      const existing = platformMap.get(platform);
      if (existing) {
        existing.push(item);
      } else {
        platformMap.set(platform, [item]);
      }
    }

    // Aggregate each platform's data
    const platforms: Array<{
      errorRate: number;
      latency: ApiMetricAggregate['latency'];
      platform: string;
      requestCount: number;
    }> = [];

    for (const [platform, items] of platformMap) {
      const aggregated = aggregateSummaries(items);
      if (aggregated) {
        platforms.push({
          errorRate: aggregated.errorRate,
          latency: aggregated.latency,
          platform,
          requestCount: aggregated.requestCount,
        });
      }
    }

    // Sort
    platforms.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case 'errorRate':
          aVal = a.errorRate;
          bVal = b.errorRate;
          break;
        case 'p75':
          aVal = a.latency.p75;
          bVal = b.latency.p75;
          break;
        case 'p99':
          aVal = a.latency.p99;
          bVal = b.latency.p99;
          break;
        default:
          aVal = a.requestCount;
          bVal = b.requestCount;
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return c.json({
      endDate,
      platforms,
      startDate,
      total: platforms.length,
    });
  },
);

/**
 * GET /metrics/api/platforms/:platform
 *
 * Time-series for a specific platform.
 * Uses GSI4 (PlatformTimeIndex) for efficient queries.
 *
 * Path params:
 * - platform: ios | android | web
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/platforms/:platform',
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    const platform = c.req.param('platform');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { endDate, startDate } = getDateRange(numDays);

    // Use GSI for efficient time-series query
    const items = await queryPlatformTimeSeries(platform, startDate, endDate);

    // Sort by date for charting
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate for period summary
    const aggregated = aggregateSummaries(items);

    return c.json({
      aggregated,
      endDate,
      platform,
      series: items.map((item) => ({
        date: item.date,
        errorRate: item.errorRate,
        latency: item.latency,
        requestCount: item.requestCount,
      })),
      startDate,
    });
  },
);

export default app;
