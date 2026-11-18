import { vValidator } from '@hono/valibot-validator';
import {
  type AggregatedApiMetrics,
  type ApiMetricAggregate,
  ApiMetricsDependencyParamSchema,
  ApiMetricsEndpointParamSchema,
  ApiMetricsEndpointsQuerySchema,
  ApiMetricsSummaryQuerySchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import { requireAuthAdmin, type Variables } from '@/middleware/auth';
import { cacheHeader } from '@/utils/cacheHeader';

import { getDateRange } from '../reads';
import {
  aggregateDependencyOperationsWithSeries,
  aggregateSummaries,
  buildPk,
  getSummaries,
  queryByPkAndPrefix,
  queryEndpointTimeSeries,
  sortApiRows,
} from './queries';

const app = new Hono<{ Variables: Variables }>();

// All API metrics routes require admin auth
app.use('*', requireAuthAdmin());

// Cache for 24 hours since data is aggregated once per day.
// Browser-only (private): admin data must never be stored at the CDN.
const METRICS_CACHE_HEADER = cacheHeader('metrics', { scope: 'private' });

app.use('*', async (c, next) => {
  c.header('Cache-Control', METRICS_CACHE_HEADER);
  await next();
});

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

  // SUMMARY item of each day with optional platform filter, sorted by date
  // ascending for the chart
  const summaries = await getSummaries(dates, { platform });

  // Aggregate all summaries into period totals
  const aggregated = aggregateSummaries(summaries);

  return c.json({
    aggregated,
    endDate,
    series: summaries.map((s) => ({
      apdex: s.apdex,
      date: s.date,
      errorRate: s.errorRate,
      latency: s.latency,
      requestCount: s.requestCount,
    })),
    startDate,
  });
});

/**
 * GET /metrics/api/endpoints
 *
 * List all endpoints with their API metrics (apdex, latency, error rate, throughput).
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - platform: ios | android | web (optional filter)
 * - country: ISO country code (optional filter)
 * - sortBy: requests | errorRate | p75 | p99 | apdex (default: requests)
 * - sortDir: asc | desc (default: desc)
 * - limit: number (optional, for top N)
 */
app.get(
  '/endpoints',
  vValidator('query', ApiMetricsEndpointsQuerySchema),
  async (c) => {
    const {
      country,
      days,
      limit,
      platform,
      sortBy = 'requests',
      sortDir = 'desc',
    } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    // Fetch endpoint items for each day with optional filters
    const allEndpointItems: ApiMetricAggregate[] = [];
    await Promise.all(
      dates.map(async (date) => {
        const pk = buildPk(date, { country, platform });
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
      apdex: AggregatedApiMetrics['apdex'];
      dependencies?: AggregatedApiMetrics['dependencies'];
      endpoint: string;
      errorRate: number;
      latency: AggregatedApiMetrics['latency'];
      requestCount: number;
      series: Array<{
        date: string;
        errorRate: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        requestCount: number;
      }>;
      throughput: number;
    }> = [];

    for (const [endpoint, items] of endpointMap) {
      const aggregated = aggregateSummaries(items);
      if (aggregated) {
        const series = items
          .map((item) => ({
            date: item.date,
            errorRate: item.errorRate,
            p75: item.latency.p75,
            p90: item.latency.p90,
            p95: item.latency.p95,
            p99: item.latency.p99,
            requestCount: item.requestCount,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        endpoints.push({
          apdex: aggregated.apdex,
          dependencies: aggregated.dependencies,
          endpoint,
          errorRate: aggregated.errorRate,
          latency: aggregated.latency,
          requestCount: aggregated.requestCount,
          series,
          throughput: aggregated.throughput,
        });
      }
    }

    sortApiRows(endpoints, sortBy, sortDir);

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
 * GET /metrics/api/endpoints/:endpoint
 *
 * Time-series and details for a specific endpoint.
 * Uses GSI1 (EndpointTimeIndex) for efficient queries.
 *
 * Path params:
 * - endpoint: URL-encoded endpoint (e.g., GET%20/tv/[id])
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/endpoints/:endpoint',
  vValidator('param', ApiMetricsEndpointParamSchema),
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    // Hono already URL-decodes path params (decoding twice breaks on '%')
    const { endpoint } = c.req.valid('param');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { endDate, startDate } = getDateRange(numDays);

    const items = await queryEndpointTimeSeries(endpoint, startDate, endDate);

    items.sort((a, b) => a.date.localeCompare(b.date));

    const aggregated = aggregateSummaries(items);

    let dependenciesWithSeries:
      | Record<
          string,
          AggregatedApiMetrics['dependencies'] extends
            | Record<string, infer T>
            | undefined
            ? T & {
                topOperations?: ReturnType<
                  typeof aggregateDependencyOperationsWithSeries
                >;
              }
            : never
        >
      | undefined;

    if (aggregated?.dependencies) {
      dependenciesWithSeries = {};
      for (const source of Object.keys(aggregated.dependencies)) {
        const depStats = aggregated.dependencies[source]!;
        const topOperations = aggregateDependencyOperationsWithSeries(
          items,
          source,
        );
        dependenciesWithSeries[source] = {
          ...depStats,
          topOperations: topOperations.length > 0 ? topOperations : undefined,
        };
      }
    }

    return c.json({
      aggregated: aggregated
        ? { ...aggregated, dependencies: dependenciesWithSeries }
        : null,
      endDate,
      endpoint,
      series: items.map((item) => ({
        apdex: item.apdex,
        date: item.date,
        dependencies: item.dependencies,
        errorRate: item.errorRate,
        latency: item.latency,
        requestCount: item.requestCount,
      })),
      startDate,
    });
  },
);

app.get(
  '/dependencies/:source',
  vValidator('param', ApiMetricsDependencyParamSchema),
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    // Hono already URL-decodes path params (decoding twice breaks on '%')
    const { source } = c.req.valid('param');
    const { days, platform } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    const summaries = await getSummaries(dates, { platform });

    const aggregated = aggregateSummaries(summaries);
    const dependency = aggregated?.dependencies?.[source];

    if (!dependency) {
      return c.json({ error: 'Dependency not found' }, 404);
    }

    const series = summaries
      .filter((s) => s.dependencies?.[source])
      .map((s) => {
        const dep = s.dependencies![source]!;
        return {
          count: dep.count,
          date: s.date,
          errorRate: dep.errorRate,
          p75: dep.p75,
          p90: dep.p90,
          p95: dep.p95,
          p99: dep.p99,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const topOperations = aggregateDependencyOperationsWithSeries(
      summaries,
      source,
    );

    return c.json({
      aggregated: { ...dependency, topOperations },
      endDate,
      series,
      source,
      startDate,
    });
  },
);

export default app;
