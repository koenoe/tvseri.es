/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Metrics tables for Speed Insights.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TABLE STRATEGY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. MetricsRaw (shared)
 *    - Raw events for both Web Vitals and API metrics
 *    - 7-day TTL, no GSIs (write-heavy, rarely read)
 *    - Used for drill-downs and complex filter queries
 *
 * 2. MetricsWebVitals (aggregated)
 *    - Pre-computed Web Vitals aggregates
 *    - 30-day TTL, GSIs for time-series
 *    - Dimensions: Route, Device, Country (and combos)
 *
 * 3. MetricsApi (aggregated)
 *    - Pre-computed API metrics aggregates
 *    - 30-day TTL, GSIs for time-series
 *    - Dimensions: Route, Status, Endpoint, Platform
 */

// ════════════════════════════════════════════════════════════════════════════
// RAW DATA TABLE (shared)
// ════════════════════════════════════════════════════════════════════════════

export const metricsRaw = new sst.aws.Dynamo('MetricsRaw', {
  fields: {
    pk: 'string', // WEB#<date> | API#<date>
    sk: 'string', // <timestamp>#<id>
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
});

// ════════════════════════════════════════════════════════════════════════════
// WEB VITALS AGGREGATES
// ════════════════════════════════════════════════════════════════════════════
/**
 * Web Vitals aggregate table.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PRIMARY INDEX - Filter combos in pk, dimension in sk
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * pk patterns (date + optional filters):
 *   "2025-12-11"                    → No filters (global view)
 *   "2025-12-11#D#mobile"           → Device filter
 *   "2025-12-11#C#US"               → Country filter
 *   "2025-12-11#D#mobile#C#US"      → Device + Country filter
 *
 * sk patterns (what you're querying):
 *   "SUMMARY"                       → Totals for this filter combo
 *   "R#/series/:id"                 → Route metrics
 *   "C#US"                          → Country metrics (when no country filter)
 *   "D#mobile"                      → Device metrics (when no device filter)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * "All routes (no filter)":
 *   pk = "2025-12-11", sk begins_with "R#"
 *
 * "Routes on mobile":
 *   pk = "2025-12-11#D#mobile", sk begins_with "R#"
 *
 * "Routes in Algeria on mobile":
 *   pk = "2025-12-11#D#mobile#C#DZ", sk begins_with "R#"
 *
 * "All countries (no filter)":
 *   pk = "2025-12-11", sk begins_with "C#"
 *
 * "Countries on mobile":
 *   pk = "2025-12-11#D#mobile", sk begins_with "C#"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GSIs - Time-series queries for specific dimensions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RouteTimeIndex:
 *   GSI1PK: "R#/series/:id", GSI1SK: "2025-12-11"
 *   → "Show /series/:id score over 30 days"
 *
 * CountryTimeIndex:
 *   GSI2PK: "C#US", GSI2SK: "2025-12-11"
 *   → "Show US score over 30 days"
 *
 * DeviceTimeIndex:
 *   GSI3PK: "D#mobile", GSI3SK: "2025-12-11"
 *   → "Show mobile score over 30 days"
 */
export const metricsWebVitals = new sst.aws.Dynamo('MetricsWebVitals', {
  fields: {
    GSI1PK: 'string', // R#<route>
    GSI1SK: 'string', // date
    GSI2PK: 'string', // C#<country>
    GSI2SK: 'string', // date
    GSI3PK: 'string', // D#<device>
    GSI3SK: 'string', // date
    pk: 'string', // <date> | <date>#D#<device> | <date>#C#<country> | <date>#D#<device>#C#<country>
    sk: 'string', // SUMMARY | R#<route> | C#<country> | D#<device>
  },
  globalIndexes: {
    CountryTimeIndex: {
      hashKey: 'GSI2PK',
      projection: 'all',
      rangeKey: 'GSI2SK',
    },
    DeviceTimeIndex: {
      hashKey: 'GSI3PK',
      projection: 'all',
      rangeKey: 'GSI3SK',
    },
    RouteTimeIndex: {
      hashKey: 'GSI1PK',
      projection: 'all',
      rangeKey: 'GSI1SK',
    },
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
});

// ════════════════════════════════════════════════════════════════════════════
// API METRICS AGGREGATES
// ════════════════════════════════════════════════════════════════════════════
/**
 * API metrics aggregate table.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PRIMARY INDEX - Filter combos in pk, dimension in sk
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * pk patterns (date + optional platform filter):
 *   "2025-12-11"                    → No filter (all platforms)
 *   "2025-12-11#P#ios"              → Platform filter
 *
 * sk patterns (what you're querying):
 *   "SUMMARY"                       → Totals for this filter combo
 *   "R#/tv/:id"                     → Route metrics
 *   "E#GET /tv/:id"                 → Endpoint metrics (method + route)
 *   "S#5xx"                         → Status category metrics
 *   "P#ios"                         → Platform metrics (when no platform filter)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * "All routes (no filter)":
 *   pk = "2025-12-11", sk begins_with "R#"
 *
 * "Routes on iOS":
 *   pk = "2025-12-11#P#ios", sk begins_with "R#"
 *
 * "All errors":
 *   pk = "2025-12-11", sk begins_with "S#"
 *
 * "5xx errors on iOS":
 *   pk = "2025-12-11#P#ios", sk = "S#5xx"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GSIs - Time-series queries for specific dimensions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RouteTimeIndex:
 *   GSI1PK: "R#/tv/:id", GSI1SK: "2025-12-11"
 *   → "Show /tv/:id latency over 30 days"
 *
 * StatusTimeIndex:
 *   GSI2PK: "S#5xx", GSI2SK: "2025-12-11"
 *   → "Show 5xx errors over 30 days"
 *
 * EndpointTimeIndex:
 *   GSI3PK: "E#GET /tv/:id", GSI3SK: "2025-12-11"
 *   → "Show GET /tv/:id latency over 30 days"
 *
 * PlatformTimeIndex:
 *   GSI4PK: "P#ios", GSI4SK: "2025-12-11"
 *   → "Show iOS performance over 30 days"
 */
export const metricsApi = new sst.aws.Dynamo('MetricsApi', {
  fields: {
    GSI1PK: 'string', // R#<route>
    GSI1SK: 'string', // date
    GSI2PK: 'string', // S#<status>
    GSI2SK: 'string', // date
    GSI3PK: 'string', // E#<endpoint>
    GSI3SK: 'string', // date
    GSI4PK: 'string', // P#<platform>
    GSI4SK: 'string', // date
    pk: 'string', // <date> | <date>#P#<platform>
    sk: 'string', // SUMMARY | R#<route> | E#<endpoint> | S#<status> | P#<platform>
  },
  globalIndexes: {
    EndpointTimeIndex: {
      hashKey: 'GSI3PK',
      projection: 'all',
      rangeKey: 'GSI3SK',
    },
    PlatformTimeIndex: {
      hashKey: 'GSI4PK',
      projection: 'all',
      rangeKey: 'GSI4SK',
    },
    RouteTimeIndex: {
      hashKey: 'GSI1PK',
      projection: 'all',
      rangeKey: 'GSI1SK',
    },
    StatusTimeIndex: {
      hashKey: 'GSI2PK',
      projection: 'all',
      rangeKey: 'GSI2SK',
    },
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
});
