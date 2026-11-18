import * as v from 'valibot';

const MetricClientSchema = v.object({
  platform: v.string(),
  userAgent: v.nullable(v.string()),
  version: v.nullable(v.string()),
});

const MetricDeviceSchema = v.object({
  os: v.optional(v.nullable(v.string())),
  osVersion: v.optional(v.nullable(v.string())),
  type: v.string(),
});

export const DependencyMetricSchema = v.object({
  duration: v.number(),
  endpoint: v.string(),
  error: v.optional(v.string()),
  params: v.nullable(v.record(v.string(), v.string())),
  source: v.string(),
  status: v.number(),
  timestamp: v.string(),
});

const HistogramSchema = v.object({
  /** Count of values in each histogram bin */
  bins: v.array(v.number()),
});

export const TimeSeriesPointSchema = v.object({
  timestamp: v.string(),
  value: v.number(),
});

const PercentileFields = {
  p75: v.number(),
  p90: v.number(),
  p95: v.number(),
  p99: v.number(),
};

const ErrorFields = {
  /** Error count for multi-day aggregation */
  errorCount: v.number(),
  /** Error rate as percentage (0-100) */
  errorRate: v.number(),
};

/**
 * Apdex threshold T in milliseconds.
 * - Satisfied: latency ≤ T
 * - Tolerating: T < latency ≤ 4T
 * - Frustrated: latency > 4T
 */
export const APDEX_T = 300;

/**
 * Apdex statistics for API latency.
 * Based on the open Apdex standard (apdex.org).
 */
export const ApdexSchema = v.object({
  /** Count of requests > 4T (user is frustrated) */
  frustrated: v.number(),
  /** Count of requests ≤ T (user is satisfied) */
  satisfied: v.number(),
  /**
   * Apdex score (0-1).
   * Formula: (satisfied + tolerating × 0.5) / total
   *
   * Score interpretation:
   * - 0.94-1.00: Excellent
   * - 0.85-0.93: Good
   * - 0.70-0.84: Fair
   * - 0.50-0.69: Poor
   * - 0.00-0.49: Unacceptable
   */
  score: v.number(),
  /** Count of requests where T < latency ≤ 4T (user tolerates) */
  tolerating: v.number(),
});

/**
 * Latency ratings breakdown.
 * Thresholds based on typical API expectations:
 * - Fast: <200ms
 * - Moderate: 200-500ms
 * - Slow: >500ms
 */
export const LatencyRatingsSchema = v.object({
  /** Count of requests with latency <200ms */
  fast: v.number(),
  /** Count of requests with latency 200-500ms */
  moderate: v.number(),
  /** Count of requests with latency >500ms */
  slow: v.number(),
});

export const PercentileStatsSchema = v.object({
  count: v.number(),
  /** Histogram for accurate multi-day percentile aggregation */
  histogram: v.optional(HistogramSchema),
  ...PercentileFields,
  /** Latency ratings breakdown for distribution visualization */
  ratings: v.optional(LatencyRatingsSchema),
});

/** Daily series point for dependency operation sparklines */
const DependencyOperationSeriesPointSchema = v.object({
  date: v.string(),
  errorRate: v.number(),
  p75: v.number(),
});

export const DependencyOperationStatsSchema = v.object({
  /** Status code counts (e.g., {"200": 150, "500": 3}) */
  codes: v.optional(v.record(v.string(), v.number())),
  count: v.number(),
  ...ErrorFields,
  histogram: HistogramSchema,
  operation: v.string(),
  ...PercentileFields,
  /** Daily series for sparkline visualization */
  series: v.optional(v.array(DependencyOperationSeriesPointSchema)),
});

export const DependencyStatsSchema = v.object({
  count: v.number(),
  ...ErrorFields,
  /** Daily error rate (%), one point per day with data. */
  errorRateHistory: v.optional(v.array(TimeSeriesPointSchema)),
  histogram: v.optional(HistogramSchema),
  /** Daily p75 latency (ms), one point per day with data. */
  history: v.optional(v.array(TimeSeriesPointSchema)),
  ...PercentileFields,
  /** Daily request count, one point per day with data. */
  requestsHistory: v.optional(v.array(TimeSeriesPointSchema)),
  throughput: v.number(),
  topOperations: v.optional(v.array(DependencyOperationStatsSchema)),
});

export const WebVitalNameSchema = v.picklist([
  'CLS',
  'FCP',
  'INP',
  'LCP',
  'TTFB',
]);

const WebVitalRatingSchema = v.picklist(['good', 'needs-improvement', 'poor']);

export const ApiMetricRecordSchema = v.object({
  authenticated: v.boolean(),
  client: MetricClientSchema,
  country: v.string(),
  dependencies: v.array(DependencyMetricSchema),
  latency: v.number(),
  method: v.string(),
  path: v.string(),
  query: v.nullable(v.record(v.string(), v.string())),
  requestId: v.string(),
  responseSize: v.number(),
  route: v.string(),
  statusCode: v.number(),
  timestamp: v.string(),
  type: v.literal('api'),
});

/** web-vitals' `Metric['navigationType']` ('soft-navigation' since v6). */
export const NavigationTypeSchema = v.picklist([
  'navigate',
  'reload',
  'back-forward',
  'back-forward-cache',
  'prerender',
  'restore',
  'soft-navigation',
]);

export const WebVitalRecordSchema = v.object({
  client: MetricClientSchema,
  country: v.string(),
  /** Delta between current value and last-reported value (useful for CLS) */
  delta: v.number(),
  device: MetricDeviceSchema,
  /** Unique ID for deduplication across multiple reports */
  id: v.string(),
  name: WebVitalNameSchema,
  navigationType: NavigationTypeSchema,
  path: v.string(),
  rating: WebVitalRatingSchema,
  route: v.string(),
  timestamp: v.string(),
  type: v.literal('web-vital'),
  value: v.number(),
});

export const MetricRecordSchema = v.variant('type', [
  ApiMetricRecordSchema,
  WebVitalRecordSchema,
]);

/**
 * A browser's batch of web vitals. Capped so one request can't enqueue an unbounded number of SQS messages
 * (the browser flushes a handful of metrics per page).
 */
export const WebVitalsBatchSchema = v.pipe(
  v.array(WebVitalRecordSchema),
  v.maxLength(50, 'Batch size too large. Maximum 50 items per request.'),
);

/** Status code category breakdown */
export const StatusCodeBreakdownSchema = v.object({
  /** 4xx client errors */
  clientError: v.number(),
  /**
   * Individual status code counts for detailed analysis.
   * Keys are status codes as strings (e.g., "200", "401", "500").
   */
  codes: v.optional(v.record(v.string(), v.number())),
  /** 3xx redirect responses */
  redirect: v.number(),
  /** 5xx server errors */
  serverError: v.number(),
  /** 2xx success responses */
  success: v.number(),
});

/** Top country item for the geographic breakdown on endpoint detail pages */
const ApiTopCountrySchema = v.object({
  /** Country code (ISO 3166-1 alpha-2) */
  country: v.string(),
  ...ErrorFields,
  /** Histogram for accurate multi-day percentile aggregation */
  histogram: HistogramSchema,
  ...PercentileFields,
  /** Number of requests from this country */
  requestCount: v.number(),
});

/** Top endpoint item for the leaderboard in SUMMARY items */
const ApiTopEndpointSchema = v.object({
  /** Apdex score (0-1) */
  apdexScore: v.number(),
  /** Dependency names for this endpoint (e.g., ["tmdb", "dynamodb"]) */
  dependencyNames: v.array(v.string()),
  /** Endpoint identifier (e.g., "GET /tv/[id]") */
  endpoint: v.string(),
  ...ErrorFields,
  /** Histogram for accurate multi-day percentile aggregation */
  histogram: HistogramSchema,
  ...PercentileFields,
  /** Number of requests */
  requestCount: v.number(),
});

/**
 * An item of the MetricsApi table: filters in pk, dimension in sk (written
 * by `aggregateApiMetrics`).
 *
 * pk patterns (date + optional filters):
 *   "2025-12-11"                    → No filter
 *   "2025-12-11#P#ios"              → Platform filter
 *   "2025-12-11#C#US"               → Country filter
 *   "2025-12-11#P#ios#C#US"         → Platform + Country filter
 *
 * sk patterns (what you're querying):
 *   "SUMMARY"                       → Totals for this filter combo
 *   "E#GET /tv/:id"                 → Endpoint metrics
 *   "P#ios"                         → Platform metrics (when no platform filter)
 *   "C#US"                          → Country metrics (when no country filter)
 *
 * GSIs for time-series:
 *   EndpointTimeIndex: GSI1PK: "E#GET /tv/:id"  GSI1SK: "2025-12-11"
 *   PlatformTimeIndex: GSI2PK: "P#ios"          GSI2SK: "2025-12-11"
 *   CountryTimeIndex:  GSI3PK: "C#US"           GSI3SK: "2025-12-11"
 */
export const ApiMetricAggregateSchema = v.object({
  apdex: ApdexSchema,
  /** YYYY-MM-DD */
  date: v.string(),
  /**
   * Dependency latencies (TMDB, DynamoDB, etc.)
   * Only populated for SUMMARY and ENDPOINT items.
   */
  dependencies: v.optional(v.record(v.string(), DependencyStatsSchema)),
  /** (4xx + 5xx) / total: a fraction (0-1), unlike the percentages in `ErrorFields` */
  errorRate: v.number(),
  /** DynamoDB TTL (30 days) */
  expiresAt: v.number(),
  /** EndpointTimeIndex: "E#<endpoint>", on the unfiltered pk's endpoint items only */
  GSI1PK: v.optional(v.string()),
  /** The date */
  GSI1SK: v.optional(v.string()),
  /** PlatformTimeIndex: "P#<platform>", on the unfiltered pk's platform items only */
  GSI2PK: v.optional(v.string()),
  /** The date */
  GSI2SK: v.optional(v.string()),
  /** CountryTimeIndex: "C#<country>", on the unfiltered pk's country items only */
  GSI3PK: v.optional(v.string()),
  /** The date */
  GSI3SK: v.optional(v.string()),
  latency: PercentileStatsSchema,
  /** "<date>", then optionally "#P#<platform>" and "#C#<country>" */
  pk: v.string(),
  requestCount: v.number(),
  /** "SUMMARY", "E#<endpoint>", or "P#<platform>" / "C#<country>" when pk has no such filter */
  sk: v.string(),
  statusCodes: StatusCodeBreakdownSchema,
  /** Top countries by request count, embedded in endpoint items */
  topCountries: v.optional(v.array(ApiTopCountrySchema)),
  /** Top endpoints by request count, embedded in SUMMARY items */
  topEndpoints: v.optional(v.array(ApiTopEndpointSchema)),
  type: v.literal('api-aggregate'),
});

/** Ratings breakdown for a single web vital metric */
export const WebVitalRatingsSchema = v.object({
  good: v.number(),
  needsImprovement: v.number(),
  poor: v.number(),
});

/**
 * Aggregated stats for a single web vital metric. The histogram's bin edges
 * per metric are in `webVitalHistogram.ts` (@tvseri.es/utils).
 */
export const WebVitalMetricStatsSchema = v.object({
  count: v.number(),
  /**
   * Histogram for accurate percentile calculation across multiple days.
   * Optional for backward compatibility with existing data.
   */
  histogram: v.optional(HistogramSchema),
  ...PercentileFields,
  ratings: WebVitalRatingsSchema,
});

/** Top item in a leaderboard (routes, countries) */
export const WebVitalTopItemSchema = v.object({
  pageviews: v.number(),
  /** Real Experience Score (0-100) */
  score: v.number(),
  /** Dimension value (route pattern, country code, etc.) */
  value: v.string(),
});

/**
 * An item of the MetricsWebVitals table: filters in pk, dimension in sk
 * (written by `aggregateWebVitals`).
 *
 * pk patterns (date + optional device/country filters):
 *   "2025-12-11"                   → No filters
 *   "2025-12-11#D#mobile"          → Device filter
 *   "2025-12-11#C#US"              → Country filter
 *   "2025-12-11#D#mobile#C#US"     → Device + Country filter
 *
 * sk patterns (what you're querying):
 *   "SUMMARY"                      → Totals for this filter combo
 *   "R#/series/:id"                → Route metrics
 *   "C#US"                         → Country metrics (when no country filter)
 *   "D#mobile"                     → Device metrics (when no device filter)
 *
 * "All routes (no filter)":
 *   pk = "2025-12-11", sk begins_with "R#"
 *
 * "Routes on mobile in Algeria":
 *   pk = "2025-12-11#D#mobile#C#DZ", sk begins_with "R#"
 *
 * GSIs for time-series:
 *   RouteTimeIndex:   GSI1PK: "R#/series/:id"  GSI1SK: "2025-12-11"
 *   CountryTimeIndex: GSI2PK: "C#US"           GSI2SK: "2025-12-11"
 *   DeviceTimeIndex:  GSI3PK: "D#mobile"       GSI3SK: "2025-12-11"
 */
export const WebVitalAggregateSchema = v.object({
  /** Not written by the aggregation: device splits are their own items (pk `#D#<device>`) */
  byDevice: v.optional(
    v.record(
      v.string(),
      v.object({
        pageviews: v.number(),
        score: v.number(),
      }),
    ),
  ),
  CLS: WebVitalMetricStatsSchema,
  /** YYYY-MM-DD */
  date: v.string(),
  /** DynamoDB TTL (30 days from creation) */
  expiresAt: v.number(),
  FCP: WebVitalMetricStatsSchema,
  /** RouteTimeIndex: "R#<route>", on the unfiltered pk's route items only */
  GSI1PK: v.optional(v.string()),
  /** The date */
  GSI1SK: v.optional(v.string()),
  /** CountryTimeIndex: "C#<country>", on the unfiltered pk's country items only */
  GSI2PK: v.optional(v.string()),
  /** The date */
  GSI2SK: v.optional(v.string()),
  /** DeviceTimeIndex: "D#<device>", on the unfiltered pk's device items only */
  GSI3PK: v.optional(v.string()),
  /** The date */
  GSI3SK: v.optional(v.string()),
  INP: WebVitalMetricStatsSchema,
  LCP: WebVitalMetricStatsSchema,
  /** Number of page views (unique metric.id count) */
  pageviews: v.number(),
  /** "<date>", then optionally "#D#<device>" and "#C#<country>" */
  pk: v.string(),
  /** Real Experience Score (0-100), from the p75s (`computeRESFromStats`) */
  score: v.number(),
  /** "SUMMARY", "R#<route>", or "C#<country>" / "D#<device>" when pk has no such filter */
  sk: v.string(),
  TTFB: WebVitalMetricStatsSchema,
  /** Top countries, embedded in SUMMARY items */
  topCountries: v.optional(v.array(WebVitalTopItemSchema)),
  /** Top routes, embedded in SUMMARY items */
  topRoutes: v.optional(v.array(WebVitalTopItemSchema)),
  type: v.literal('web-vital-aggregate'),
});

/**
 * `days` query param: a whole number of days, clamped to 1-30 (default 7);
 * the dashboard sends 3, 7 or 30. Anything else is a 400, never NaN.
 */
const MetricsDaysSchema = v.optional(
  v.pipe(
    v.string(),
    v.regex(/^\d{1,4}$/, 'days must be a whole number'),
    v.transform(Number),
    v.toMinValue(1),
    v.toMaxValue(30),
  ),
  '7',
);

/**
 * Query parameters for metrics summary endpoint.
 */
export const MetricsSummaryQuerySchema = v.object({
  /** Country filter (ISO code) */
  country: v.optional(v.string()),
  /** Number of days to query, clamped to 1-30 */
  days: MetricsDaysSchema,
  /** Device filter (mobile, tablet, desktop) */
  device: v.optional(v.string()),
});

/**
 * Query parameters for metrics routes list endpoint.
 */
export const MetricsRoutesQuerySchema = v.object({
  /** Country filter (ISO code) */
  country: v.optional(v.string()),
  /** Number of days to query, clamped to 1-30 */
  days: MetricsDaysSchema,
  /** Device filter (mobile, tablet, desktop) */
  device: v.optional(v.string()),
  /** Limit results */
  limit: v.optional(v.pipe(v.string(), v.transform(Number))),
  /** Sort by field */
  sortBy: v.optional(v.picklist(['pageviews', 'score', 'LCP', 'INP', 'CLS'])),
  /** Sort direction */
  sortDir: v.optional(v.picklist(['asc', 'desc'])),
});

/**
 * A metrics dimension in a path segment (route, country, device, endpoint,
 * dependency, platform): bounded, so it can't be anything as a key
 */
const MetricsKeyParamSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(256),
);

/**
 * Query parameters for metrics countries list endpoint.
 */
export const MetricsCountriesQuerySchema = v.object({
  /** Number of days to query, clamped to 1-30 */
  days: MetricsDaysSchema,
  /** Device filter (mobile, tablet, desktop) */
  device: v.optional(v.string()),
  /** Limit results */
  limit: v.optional(v.pipe(v.string(), v.transform(Number))),
  /** Sort by field */
  sortBy: v.optional(v.picklist(['pageviews', 'score', 'LCP', 'INP', 'CLS'])),
  /** Sort direction */
  sortDir: v.optional(v.picklist(['asc', 'desc'])),
});

/**
 * Query parameters for API metrics summary endpoint.
 */
export const ApiMetricsSummaryQuerySchema = v.object({
  /** Number of days to query, clamped to 1-30 */
  days: MetricsDaysSchema,
  /** Platform filter (ios, android, web) */
  platform: v.optional(v.string()),
});

/**
 * Path parameters for single endpoint.
 */
export const ApiMetricsEndpointParamSchema = v.object({
  /** URL-encoded endpoint (e.g., GET%20/tv/[id]) */
  endpoint: MetricsKeyParamSchema,
});

/** Path parameters for one dependency (`tmdb`, `dynamodb`...) */
export const ApiMetricsDependencyParamSchema = v.object({
  source: MetricsKeyParamSchema,
});

/**
 * Query parameters for API metrics endpoints list.
 */
export const ApiMetricsEndpointsQuerySchema = v.object({
  /** Country filter (ISO code) */
  country: v.optional(v.string()),
  /** Number of days to query, clamped to 1-30 */
  days: MetricsDaysSchema,
  /** Limit results */
  limit: v.optional(v.pipe(v.string(), v.transform(Number))),
  /** Platform filter (ios, android, web) */
  platform: v.optional(v.string()),
  /** Sort by field */
  sortBy: v.optional(
    v.picklist(['requests', 'errorRate', 'p75', 'p99', 'apdex']),
  ),
  /** Sort direction */
  sortDir: v.optional(v.picklist(['asc', 'desc'])),
});

export type DependencyMetric = v.InferOutput<typeof DependencyMetricSchema>;
export type Apdex = v.InferOutput<typeof ApdexSchema>;
export type LatencyRatings = v.InferOutput<typeof LatencyRatingsSchema>;
export type PercentileStats = v.InferOutput<typeof PercentileStatsSchema>;
export type DependencyOperationStats = v.InferOutput<
  typeof DependencyOperationStatsSchema
>;
export type DependencyStats = v.InferOutput<typeof DependencyStatsSchema>;
export type StatusCodeBreakdown = v.InferOutput<
  typeof StatusCodeBreakdownSchema
>;
export type WebVitalName = v.InferOutput<typeof WebVitalNameSchema>;
export type WebVitalRatings = v.InferOutput<typeof WebVitalRatingsSchema>;
export type TimeSeriesPoint = v.InferOutput<typeof TimeSeriesPointSchema>;
export type WebVitalMetricStats = v.InferOutput<
  typeof WebVitalMetricStatsSchema
>;
export type WebVitalTopItem = v.InferOutput<typeof WebVitalTopItemSchema>;
export type NavigationType = v.InferOutput<typeof NavigationTypeSchema>;
export type ApiMetricRecord = v.InferOutput<typeof ApiMetricRecordSchema>;
export type WebVitalRecord = v.InferOutput<typeof WebVitalRecordSchema>;
export type MetricRecord = v.InferOutput<typeof MetricRecordSchema>;
export type ApiMetricAggregate = v.InferOutput<typeof ApiMetricAggregateSchema>;
export type WebVitalAggregate = v.InferOutput<typeof WebVitalAggregateSchema>;

/**
 * Reusable web vitals metrics object (all 5 metrics + pageviews/score)
 */
const WebVitalsMetricsObject = {
  CLS: WebVitalMetricStatsSchema,
  FCP: WebVitalMetricStatsSchema,
  INP: WebVitalMetricStatsSchema,
  LCP: WebVitalMetricStatsSchema,
  pageviews: v.number(),
  score: v.number(),
  TTFB: WebVitalMetricStatsSchema,
};

/**
 * Aggregated metrics for a time period (all 5 web vitals + pageviews/score)
 */
export const AggregatedMetricsSchema = v.object(WebVitalsMetricsObject);

/**
 * Daily data point for time series charts
 */
export const MetricSeriesItemSchema = v.object({
  ...WebVitalsMetricsObject,
  date: v.string(),
});

/**
 * Response from /metrics/web-vitals/summary
 */
export const MetricsSummaryResponseSchema = v.object({
  aggregated: v.nullable(AggregatedMetricsSchema),
  endDate: v.string(),
  series: v.array(MetricSeriesItemSchema),
  startDate: v.string(),
});

/**
 * Route metrics item
 */
export const RouteMetricsSchema = v.object({
  ...WebVitalsMetricsObject,
  route: v.string(),
});

/**
 * Response from /metrics/web-vitals/routes
 */
export const MetricsRoutesResponseSchema = v.object({
  endDate: v.string(),
  routes: v.array(RouteMetricsSchema),
  startDate: v.string(),
  total: v.number(),
});

/**
 * Country metrics item
 */
export const CountryMetricsSchema = v.object({
  ...WebVitalsMetricsObject,
  country: v.string(),
});

/**
 * Response from /metrics/web-vitals/countries
 */
export const MetricsCountriesResponseSchema = v.object({
  countries: v.array(CountryMetricsSchema),
  endDate: v.string(),
  startDate: v.string(),
  total: v.number(),
});

/**
 * Reusable API metrics object for aggregated data
 */
const ApiMetricsObject = {
  apdex: ApdexSchema,
  errorRate: v.number(),
  latency: PercentileStatsSchema,
  requestCount: v.number(),
};

/**
 * Aggregated API metrics for a time period
 */
export const AggregatedApiMetricsSchema = v.object({
  ...ApiMetricsObject,
  dependencies: v.optional(v.record(v.string(), DependencyStatsSchema)),
  statusCodes: StatusCodeBreakdownSchema,
  throughput: v.number(),
});

/**
 * Daily data point for API metrics time series charts
 */
const ApiMetricSeriesItemSchema = v.object({
  ...ApiMetricsObject,
  date: v.string(),
});

/**
 * Response from /metrics/api/summary
 */
export const ApiMetricsSummaryResponseSchema = v.object({
  aggregated: v.nullable(AggregatedApiMetricsSchema),
  endDate: v.string(),
  series: v.array(ApiMetricSeriesItemSchema),
  startDate: v.string(),
});

/**
 * Daily series item for endpoint sparklines.
 * Contains key metrics per day for trend visualization.
 */
const EndpointDailySeriesItemSchema = v.object({
  date: v.string(),
  errorRate: v.number(),
  p75: v.number(),
  p90: v.number(),
  p95: v.number(),
  p99: v.number(),
  requestCount: v.number(),
});

/**
 * Endpoint metrics item
 */
export const EndpointMetricsSchema = v.object({
  ...ApiMetricsObject,
  dependencies: v.optional(v.record(v.string(), DependencyStatsSchema)),
  endpoint: v.string(),
  /** Daily metrics for sparkline visualization */
  series: v.optional(v.array(EndpointDailySeriesItemSchema)),
  throughput: v.number(),
});

/**
 * Response from /metrics/api/endpoints
 */
export const ApiMetricsEndpointsResponseSchema = v.object({
  endDate: v.string(),
  endpoints: v.array(EndpointMetricsSchema),
  startDate: v.string(),
  total: v.number(),
});

export type AggregatedMetrics = v.InferOutput<typeof AggregatedMetricsSchema>;
export type MetricSeriesItem = v.InferOutput<typeof MetricSeriesItemSchema>;
export type MetricsSummaryResponse = v.InferOutput<
  typeof MetricsSummaryResponseSchema
>;
export type RouteMetrics = v.InferOutput<typeof RouteMetricsSchema>;
export type MetricsRoutesResponse = v.InferOutput<
  typeof MetricsRoutesResponseSchema
>;
export type CountryMetrics = v.InferOutput<typeof CountryMetricsSchema>;
export type MetricsCountriesResponse = v.InferOutput<
  typeof MetricsCountriesResponseSchema
>;

export type AggregatedApiMetrics = v.InferOutput<
  typeof AggregatedApiMetricsSchema
>;
export type ApiMetricsSummaryResponse = v.InferOutput<
  typeof ApiMetricsSummaryResponseSchema
>;
export type EndpointMetrics = v.InferOutput<typeof EndpointMetricsSchema>;
export type ApiMetricsEndpointsResponse = v.InferOutput<
  typeof ApiMetricsEndpointsResponseSchema
>;
