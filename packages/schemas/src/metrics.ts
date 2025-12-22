/**
 * Metrics schemas and types for API and Web Vitals tracking.
 */
import * as v from 'valibot';

// ============================================================================
// Shared schemas
// ============================================================================

export const MetricClientSchema = v.object({
  platform: v.string(),
  userAgent: v.nullable(v.string()),
  version: v.nullable(v.string()),
});

export const MetricDeviceSchema = v.object({
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

export const HistogramSchema = v.object({
  /** Count of values in each histogram bin */
  bins: v.array(v.number()),
});

export const TimeSeriesPointSchema = v.object({
  timestamp: v.string(),
  value: v.number(),
});

/**
 * Base percentile fields (p75, p90, p95, p99).
 * Reused across multiple schemas for latency distributions.
 */
const PercentileFields = {
  /** 75th percentile */
  p75: v.number(),
  /** 90th percentile */
  p90: v.number(),
  /** 95th percentile */
  p95: v.number(),
  /** 99th percentile */
  p99: v.number(),
};

/**
 * Base error tracking fields.
 * Reused across schemas that track error rates.
 */
const ErrorFields = {
  /** Error count for multi-day aggregation */
  errorCount: v.number(),
  /** Error rate as percentage (0-100) */
  errorRate: v.number(),
};

// ============================================================================
// Apdex schemas (Application Performance Index - open standard)
// ============================================================================

/**
 * Apdex threshold T in milliseconds.
 * - Satisfied: latency ≤ T
 * - Tolerating: T < latency ≤ 4T
 * - Frustrated: latency > 4T
 *
 * Default: 300ms (suitable for real-time APIs)
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

/**
 * Daily series point for dependency operation sparklines.
 */
export const DependencyOperationSeriesPointSchema = v.object({
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
  histogram: v.optional(HistogramSchema),
  history: v.optional(v.array(TimeSeriesPointSchema)),
  ...PercentileFields,
  throughput: v.number(),
  topOperations: v.optional(v.array(DependencyOperationStatsSchema)),
});

// ============================================================================
// Raw metric schemas
// ============================================================================

export const WebVitalNameSchema = v.picklist([
  'CLS',
  'FCP',
  'INP',
  'LCP',
  'TTFB',
]);

export const WebVitalRatingSchema = v.picklist([
  'good',
  'needs-improvement',
  'poor',
]);

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

export const NavigationTypeSchema = v.picklist([
  'navigate',
  'reload',
  'back-forward',
  'back-forward-cache',
  'prerender',
  'restore',
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
 * Schema for batch web vitals submission from browser.
 */
export const WebVitalsBatchSchema = v.array(WebVitalRecordSchema);

// ============================================================================
// Aggregate schemas
// ============================================================================

/**
 * HTTP method picklist for API metrics.
 */
export const HttpMethodSchema = v.picklist([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

/**
 * Status code category breakdown.
 */
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

/**
 * Top country item for geographic breakdown on endpoint detail pages.
 * Shows which countries are hitting an endpoint and their performance.
 */
export const ApiTopCountrySchema = v.object({
  /** Country code (ISO 3166-1 alpha-2) */
  country: v.string(),
  ...ErrorFields,
  /** Histogram for accurate multi-day percentile aggregation */
  histogram: HistogramSchema,
  ...PercentileFields,
  /** Number of requests from this country */
  requestCount: v.number(),
});

/**
 * Top endpoint item for leaderboards in SUMMARY.
 * Similar to WebVitalTopItemSchema but for API metrics.
 */
export const ApiTopEndpointSchema = v.object({
  /** Apdex score (0-1) */
  apdexScore: v.number(),
  /** Dependency names for this endpoint (e.g., ["TMDB", "MDBLIST"]) */
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
 * Top path item for endpoint detail pages.
 * Shows concrete paths (e.g., "/series/1396") with their metrics.
 * Includes histogram for accurate multi-day percentile aggregation.
 */
export const ApiTopPathSchema = v.object({
  /** Status code counts (e.g., {"200": 150, "404": 3}) */
  codes: v.record(v.string(), v.number()),
  ...ErrorFields,
  /** Histogram for accurate multi-day percentile aggregation */
  histogram: HistogramSchema,
  ...PercentileFields,
  /** Concrete path (e.g., "/series/1396") */
  path: v.string(),
  /** Number of requests to this path */
  requestCount: v.number(),
});

/**
 * API metrics aggregate schema - stored in MetricsApi table
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEY DESIGN: Filters in pk, dimension in sk
 * ═══════════════════════════════════════════════════════════════════════════
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
  /**
   * Apdex (Application Performance Index) statistics.
   * Measures user satisfaction with response times.
   */
  apdex: ApdexSchema,
  /** Date in YYYY-MM-DD format */
  date: v.string(),
  /**
   * Dependency latencies (TMDB, DynamoDB, etc.)
   * Only populated for SUMMARY and ENDPOINT items.
   */
  dependencies: v.optional(v.record(v.string(), DependencyStatsSchema)),
  /** Error rate (4xx + 5xx) / total */
  errorRate: v.number(),
  /** TTL for DynamoDB (30 days) */
  expiresAt: v.number(),
  /**
   * GSI1 partition key - for endpoint time-series queries.
   * Only set on ENDPOINT items.
   * Format: "E#GET /tv/:id"
   */
  GSI1PK: v.optional(v.string()),
  /** GSI1 sort key - date for time range queries */
  GSI1SK: v.optional(v.string()),
  /**
   * GSI2 partition key - for platform time-series queries.
   * Only set on PLATFORM items.
   * Format: "P#ios"
   */
  GSI2PK: v.optional(v.string()),
  /** GSI2 sort key - date for time range queries */
  GSI2SK: v.optional(v.string()),
  /**
   * GSI3 partition key - for country time-series queries.
   * Only set on COUNTRY items.
   * Format: "C#US"
   */
  GSI3PK: v.optional(v.string()),
  /** GSI3 sort key - date for time range queries */
  GSI3SK: v.optional(v.string()),
  /** Latency percentile statistics */
  latency: PercentileStatsSchema,
  /**
   * Partition key: "<date>" or "<date>#P#<platform>"
   * Examples: "2025-12-11", "2025-12-11#P#ios"
   */
  pk: v.string(),
  /** Total request count */
  requestCount: v.number(),
  /**
   * Sort key - dimension type:
   * - "SUMMARY" (totals for this pk's filter)
   * - "E#GET /tv/:id" (endpoint)
   * - "S#5xx" (status category)
   * - "P#ios" (platform, when pk has no platform filter)
   * - "C#US" (country)
   */
  sk: v.string(),
  /** Status code breakdown */
  statusCodes: StatusCodeBreakdownSchema,
  /**
   * Top countries by request count, embedded in ENDPOINT items.
   * Geographic breakdown for endpoint detail pages.
   */
  topCountries: v.optional(v.array(ApiTopCountrySchema)),
  /**
   * Top endpoints by request count, embedded in SUMMARY items.
   * Pre-computed leaderboard for dashboard.
   */
  topEndpoints: v.optional(v.array(ApiTopEndpointSchema)),
  /**
   * Top paths by request count, embedded in ENDPOINT items.
   * Shows concrete paths (e.g., "/series/1396") for endpoint detail pages.
   */
  topPaths: v.optional(v.array(ApiTopPathSchema)),
  type: v.literal('api-aggregate'),
});

/**
 * Ratings breakdown for a single web vital metric.
 */
export const WebVitalRatingsSchema = v.object({
  good: v.number(),
  needsImprovement: v.number(),
  poor: v.number(),
});

/**
 * Aggregated stats for a single web vital metric.
 * Full percentile distribution + ratings breakdown + histogram for accurate aggregation.
 *
 * Histogram bin edges per metric (values in native units - ms for INP, s for others, unitless for CLS):
 * - LCP: [0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 8.0, ∞]
 * - FCP: [0, 0.5, 1.0, 1.5, 1.8, 2.2, 2.6, 3.0, 4.0, 5.0, ∞]
 * - INP: [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000, ∞]
 * - CLS: [0, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5, ∞]
 * - TTFB: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.8, 2.5, 4.0, ∞]
 */
export const WebVitalMetricStatsSchema = v.object({
  /** Sample count for this metric */
  count: v.number(),
  /**
   * Histogram for accurate percentile calculation across multiple days.
   * Optional for backward compatibility with existing data.
   */
  histogram: v.optional(HistogramSchema),
  ...PercentileFields,
  /** Ratings breakdown */
  ratings: WebVitalRatingsSchema,
});

/**
 * Top item in a leaderboard (routes, countries, etc.)
 */
export const WebVitalTopItemSchema = v.object({
  /** Number of page views */
  pageviews: v.number(),
  /** Real Experience Score (0-100) */
  score: v.number(),
  /** Dimension value (route pattern, country code, etc.) */
  value: v.string(),
});

/**
 * Web vitals aggregate schema - stored in MetricsWebVitals table
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEY DESIGN: Filters in pk, dimension in sk
 * ═══════════════════════════════════════════════════════════════════════════
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
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
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
  /**
   * Device breakdown embedded in ROUTE items.
   * Map of device type → stats for quick access without extra queries.
   */
  byDevice: v.optional(
    v.record(
      v.string(),
      v.object({
        pageviews: v.number(),
        score: v.number(),
      }),
    ),
  ),
  /** All 5 web vitals metrics aggregated */
  CLS: WebVitalMetricStatsSchema,
  /** Date in YYYY-MM-DD format */
  date: v.string(),
  /** TTL for DynamoDB (30 days from creation) */
  expiresAt: v.number(),
  FCP: WebVitalMetricStatsSchema,
  /**
   * GSI1 partition key - for route time-series queries.
   * Only set on ROUTE and ROUTE+* items (sparse index).
   * Format: "R#/tv/[id]"
   */
  GSI1PK: v.optional(v.string()),
  /**
   * GSI1 sort key - date for time range queries.
   * Format: "2025-12-11" or "2025-12-11#D#mobile" for cross-filter
   */
  GSI1SK: v.optional(v.string()),
  /**
   * GSI2 partition key - for country time-series queries.
   * Only set on COUNTRY and COUNTRY+* items (sparse index).
   * Format: "C#US"
   */
  GSI2PK: v.optional(v.string()),
  /**
   * GSI2 sort key - date for time range queries.
   * Format: "2025-12-11"
   */
  GSI2SK: v.optional(v.string()),
  /**
   * GSI3 partition key - for device time-series queries.
   * Only set on DEVICE items (sparse index).
   * Format: "D#mobile"
   */
  GSI3PK: v.optional(v.string()),
  /**
   * GSI3 sort key - date for time range queries.
   * Format: "2025-12-11"
   */
  GSI3SK: v.optional(v.string()),
  INP: WebVitalMetricStatsSchema,
  LCP: WebVitalMetricStatsSchema,
  /** Number of page views (unique metric.id count) */
  pageviews: v.number(),
  /**
   * Partition key: "<date>" or "<date>#D#<device>" or "<date>#C#<country>" or "<date>#D#<device>#C#<country>"
   * Examples: "2025-12-11", "2025-12-11#D#mobile", "2025-12-11#D#mobile#C#DZ"
   */
  pk: v.string(),
  /**
   * Real Experience Score (0-100)
   * Weighted average of good ratings across all metrics
   */
  score: v.number(),
  /**
   * Sort key - dimension type:
   * - "SUMMARY" (totals for this pk's filter)
   * - "R#/series/:id" (route)
   * - "C#US" (country, when pk has no country filter)
   * - "D#mobile" (device, when pk has no device filter)
   */
  sk: v.string(),
  TTFB: WebVitalMetricStatsSchema,
  /**
   * Top countries embedded in SUMMARY items.
   * Pre-computed leaderboard for dashboard.
   */
  topCountries: v.optional(v.array(WebVitalTopItemSchema)),
  /**
   * Top routes embedded in SUMMARY items.
   * Pre-computed leaderboard for dashboard.
   */
  topRoutes: v.optional(v.array(WebVitalTopItemSchema)),
  type: v.literal('web-vital-aggregate'),
});

// ============================================================================
// API Query schemas
// ============================================================================

/**
 * Query parameters for metrics summary endpoint.
 */
export const MetricsSummaryQuerySchema = v.object({
  /** Country filter (ISO code) */
  country: v.optional(v.string()),
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
  /** Device filter (mobile, tablet, desktop) */
  device: v.optional(v.string()),
});

/**
 * Query parameters for metrics routes list endpoint.
 */
export const MetricsRoutesQuerySchema = v.object({
  /** Country filter (ISO code) */
  country: v.optional(v.string()),
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
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
 * Path parameters for single route endpoint.
 */
export const MetricsRouteParamSchema = v.object({
  route: v.string(),
});

/**
 * Query parameters for single route endpoint (time-series only).
 */
export const MetricsRouteQuerySchema = v.object({
  /** Number of days to query */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
});

/**
 * Query parameters for metrics countries list endpoint.
 */
export const MetricsCountriesQuerySchema = v.object({
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
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
 * Path parameters for single country endpoint.
 */
export const MetricsCountryParamSchema = v.object({
  country: v.string(),
});

/**
 * Query parameters for single country endpoint (time-series only).
 */
export const MetricsCountryQuerySchema = v.object({
  /** Number of days to query */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
});

/**
 * Query parameters for metrics devices endpoint.
 */
export const MetricsDevicesQuerySchema = v.object({
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
  /** Sort by field */
  sortBy: v.optional(v.picklist(['pageviews', 'score', 'LCP', 'INP', 'CLS'])),
  /** Sort direction */
  sortDir: v.optional(v.picklist(['asc', 'desc'])),
});

/**
 * Path parameters for single device endpoint.
 */
export const MetricsDeviceParamSchema = v.object({
  device: v.string(),
});

// ============================================================================
// API Metrics Query schemas
// ============================================================================

/**
 * Query parameters for API metrics summary endpoint.
 */
export const ApiMetricsSummaryQuerySchema = v.object({
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
  /** Platform filter (ios, android, web) */
  platform: v.optional(v.string()),
});

/**
 * Path parameters for single endpoint.
 */
export const ApiMetricsEndpointParamSchema = v.object({
  /** URL-encoded endpoint (e.g., GET%20/tv/[id]) */
  endpoint: v.string(),
});

/**
 * Query parameters for API metrics status codes endpoint.
 */
export const ApiMetricsStatusQuerySchema = v.object({
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
  /** Platform filter (ios, android, web) */
  platform: v.optional(v.string()),
});

/**
 * Query parameters for API metrics endpoints list.
 */
export const ApiMetricsEndpointsQuerySchema = v.object({
  /** Country filter (ISO code) */
  country: v.optional(v.string()),
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
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

/**
 * Query parameters for API metrics platforms endpoint.
 */
export const ApiMetricsPlatformsQuerySchema = v.object({
  /** Number of days to query (1, 7, or 30) */
  days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
  /** Sort by field */
  sortBy: v.optional(v.picklist(['requests', 'errorRate', 'p75', 'p99'])),
  /** Sort direction */
  sortDir: v.optional(v.picklist(['asc', 'desc'])),
});

// ============================================================================
// Inferred types
// ============================================================================

export type MetricClient = v.InferOutput<typeof MetricClientSchema>;
export type MetricDevice = v.InferOutput<typeof MetricDeviceSchema>;
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
export type ApiTopCountry = v.InferOutput<typeof ApiTopCountrySchema>;
export type ApiTopEndpoint = v.InferOutput<typeof ApiTopEndpointSchema>;
export type ApiTopPath = v.InferOutput<typeof ApiTopPathSchema>;
export type HttpMethod = v.InferOutput<typeof HttpMethodSchema>;
export type WebVitalName = v.InferOutput<typeof WebVitalNameSchema>;
export type WebVitalRating = v.InferOutput<typeof WebVitalRatingSchema>;
export type WebVitalRatings = v.InferOutput<typeof WebVitalRatingsSchema>;
export type Histogram = v.InferOutput<typeof HistogramSchema>;
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

// ============================================================================
// Response schemas
// ============================================================================

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
 * Device metrics item
 */
export const DeviceMetricsSchema = v.object({
  ...WebVitalsMetricsObject,
  device: v.string(),
});

/**
 * Response from /metrics/web-vitals/devices
 */
export const MetricsDevicesResponseSchema = v.object({
  devices: v.array(DeviceMetricsSchema),
  endDate: v.string(),
  startDate: v.string(),
  total: v.number(),
});

/**
 * Response from /metrics/web-vitals/devices/:device
 */
export const MetricsDeviceTimeSeriesResponseSchema = v.object({
  aggregated: v.nullable(AggregatedMetricsSchema),
  device: v.string(),
  endDate: v.string(),
  series: v.array(MetricSeriesItemSchema),
  startDate: v.string(),
});

// ============================================================================
// API Metrics Response schemas
// ============================================================================

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
export const ApiMetricSeriesItemSchema = v.object({
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
export const EndpointDailySeriesItemSchema = v.object({
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

/**
 * API country metrics item
 */
export const ApiCountryMetricsSchema = v.object({
  ...ApiMetricsObject,
  country: v.string(),
});

/**
 * Response from /metrics/api/countries
 */
export const ApiMetricsCountriesResponseSchema = v.object({
  countries: v.array(ApiCountryMetricsSchema),
  endDate: v.string(),
  startDate: v.string(),
  total: v.number(),
});

// ============================================================================
// Additional inferred types from response schemas
// ============================================================================

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
export type DeviceMetrics = v.InferOutput<typeof DeviceMetricsSchema>;
export type MetricsDevicesResponse = v.InferOutput<
  typeof MetricsDevicesResponseSchema
>;
export type MetricsDeviceTimeSeriesResponse = v.InferOutput<
  typeof MetricsDeviceTimeSeriesResponseSchema
>;

// API Metrics types
export type AggregatedApiMetrics = v.InferOutput<
  typeof AggregatedApiMetricsSchema
>;
export type ApiMetricSeriesItem = v.InferOutput<
  typeof ApiMetricSeriesItemSchema
>;
export type ApiMetricsSummaryResponse = v.InferOutput<
  typeof ApiMetricsSummaryResponseSchema
>;
export type EndpointDailySeriesItem = v.InferOutput<
  typeof EndpointDailySeriesItemSchema
>;
export type EndpointMetrics = v.InferOutput<typeof EndpointMetricsSchema>;
export type ApiMetricsEndpointsResponse = v.InferOutput<
  typeof ApiMetricsEndpointsResponseSchema
>;
export type ApiCountryMetrics = v.InferOutput<typeof ApiCountryMetricsSchema>;
export type ApiMetricsCountriesResponse = v.InferOutput<
  typeof ApiMetricsCountriesResponseSchema
>;
