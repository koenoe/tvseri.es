import { vValidator } from '@hono/valibot-validator';
import {
  type AggregatedApiMetrics,
  type ApiMetricAggregate,
  ApiMetricsEndpointsQuerySchema,
  ApiMetricsPlatformsQuerySchema,
  ApiMetricsSummaryQuerySchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';

import { requireAuthAdmin, type Variables } from '@/middleware/auth';

import {
  aggregateDependencyOperationsWithSeries,
  aggregateSummaries,
  aggregateTopPaths,
  buildPk,
  getDateRange,
  queryByPkAndPrefix,
  queryCountryTimeSeries,
  queryEndpointTimeSeries,
  queryPlatformTimeSeries,
} from './queries';

const app = new Hono<{ Variables: Variables }>();

// All API metrics routes require admin auth
app.use('*', requireAuthAdmin());

// Cache for 24 hours since data is aggregated once per day
app.use('*', async (c, next) => {
  c.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  await next();
});

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
      apdex: s.apdex,
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

    // Sort
    endpoints.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case 'apdex':
          aVal = a.apdex.score;
          bVal = b.apdex.score;
          break;
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
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    const endpointParam = c.req.param('endpoint');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const decodedEndpoint = decodeURIComponent(endpointParam);
    const { endDate, startDate } = getDateRange(numDays);

    const items = await queryEndpointTimeSeries(
      decodedEndpoint,
      startDate,
      endDate,
    );

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

    const topPaths = aggregateTopPaths(items);

    return c.json({
      aggregated: aggregated
        ? { ...aggregated, dependencies: dependenciesWithSeries }
        : null,
      endDate,
      endpoint: decodedEndpoint,
      series: items.map((item) => ({
        apdex: item.apdex,
        date: item.date,
        dependencies: item.dependencies,
        errorRate: item.errorRate,
        latency: item.latency,
        requestCount: item.requestCount,
      })),
      startDate,
      topPaths: topPaths.length > 0 ? topPaths : undefined,
    });
  },
);

// ════════════════════════════════════════════════════════════════════════════
// DEPENDENCIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /metrics/api/dependencies
 *
 * List all external dependencies (TMDB, DynamoDB, etc.) with their latency stats.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - platform: ios | android | web (optional filter)
 */
app.get(
  '/dependencies',
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    const { days, platform } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    // Fetch SUMMARY items (which contain dependencies)
    const summaries: ApiMetricAggregate[] = [];
    await Promise.all(
      dates.map(async (date) => {
        const pk = buildPk(date, { platform });
        const items = await queryByPkAndPrefix(pk, 'SUMMARY');
        summaries.push(...items);
      }),
    );

    // Aggregate to get combined dependency stats
    const aggregated = aggregateSummaries(summaries);

    // Transform dependencies into array format with series data
    const dependencies = aggregated?.dependencies
      ? Object.entries(aggregated.dependencies)
          .map(([source, stats]) => {
            // Build series from daily summaries
            const series = summaries
              .filter((s) => s.dependencies?.[source])
              .map((s) => {
                const dep = s.dependencies![source]!;
                return {
                  count: dep.count,
                  date: s.date,
                  errorRate: dep.errorRate,
                  p75: dep.p75,
                };
              })
              .sort((a, b) => a.date.localeCompare(b.date));

            return {
              ...stats,
              series,
              source,
            };
          })
          .sort((a, b) => b.count - a.count)
      : [];

    return c.json({
      dependencies,
      endDate,
      startDate,
      total: dependencies.length,
    });
  },
);

app.get(
  '/dependencies/:source',
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    const source = decodeURIComponent(c.req.param('source'));
    const { days, platform } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    const summaries: ApiMetricAggregate[] = [];
    await Promise.all(
      dates.map(async (date) => {
        const pk = buildPk(date, { platform });
        const items = await queryByPkAndPrefix(pk, 'SUMMARY');
        summaries.push(...items);
      }),
    );

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
      apdex: AggregatedApiMetrics['apdex'];
      errorRate: number;
      latency: AggregatedApiMetrics['latency'];
      platform: string;
      requestCount: number;
    }> = [];

    for (const [platform, items] of platformMap) {
      const aggregated = aggregateSummaries(items);
      if (aggregated) {
        platforms.push({
          apdex: aggregated.apdex,
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
 * Uses GSI3 (PlatformTimeIndex) for efficient queries.
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
        apdex: item.apdex,
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
// COUNTRIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /metrics/api/countries
 *
 * List all countries with their API metrics.
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 * - platform: ios | android | web (optional filter)
 * - sortBy: requests | errorRate | p75 | p99 (default: requests)
 * - sortDir: asc | desc (default: desc)
 */
app.get(
  '/countries',
  vValidator('query', ApiMetricsPlatformsQuerySchema),
  async (c) => {
    const {
      days,
      sortBy = 'requests',
      sortDir = 'desc',
    } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { dates, endDate, startDate } = getDateRange(numDays);

    // Fetch country items for each day (no filter - base pk only)
    const allCountryItems: ApiMetricAggregate[] = [];
    await Promise.all(
      dates.map(async (date) => {
        const pk = buildPk(date);
        const items = await queryByPkAndPrefix(pk, 'C#');
        allCountryItems.push(...items);
      }),
    );

    // Group by country and aggregate across days
    const countryMap = new Map<string, ApiMetricAggregate[]>();
    for (const item of allCountryItems) {
      const country = item.sk.replace('C#', '');
      const existing = countryMap.get(country);
      if (existing) {
        existing.push(item);
      } else {
        countryMap.set(country, [item]);
      }
    }

    // Aggregate each country's data
    const countries: Array<{
      apdex: AggregatedApiMetrics['apdex'];
      country: string;
      errorRate: number;
      latency: AggregatedApiMetrics['latency'];
      requestCount: number;
    }> = [];

    for (const [country, items] of countryMap) {
      const aggregated = aggregateSummaries(items);
      if (aggregated) {
        countries.push({
          apdex: aggregated.apdex,
          country,
          errorRate: aggregated.errorRate,
          latency: aggregated.latency,
          requestCount: aggregated.requestCount,
        });
      }
    }

    // Sort
    countries.sort((a, b) => {
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
      countries,
      endDate,
      startDate,
      total: countries.length,
    });
  },
);

/**
 * GET /metrics/api/countries/:country
 *
 * Time-series for a specific country.
 * Uses GSI4 (CountryTimeIndex) for efficient queries.
 *
 * Path params:
 * - country: ISO country code (e.g., US, GB, NL)
 *
 * Query params:
 * - days: 1 | 7 | 30 (default: 7)
 */
app.get(
  '/countries/:country',
  vValidator('query', ApiMetricsSummaryQuerySchema),
  async (c) => {
    const country = c.req.param('country');
    const { days } = c.req.valid('query');
    const numDays = Math.min(Math.max(days, 1), 30);

    const { endDate, startDate } = getDateRange(numDays);

    // Use GSI for efficient time-series query
    const items = await queryCountryTimeSeries(country, startDate, endDate);

    // Sort by date for charting
    items.sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate for period summary
    const aggregated = aggregateSummaries(items);

    return c.json({
      aggregated,
      country,
      endDate,
      series: items.map((item) => ({
        apdex: item.apdex,
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
