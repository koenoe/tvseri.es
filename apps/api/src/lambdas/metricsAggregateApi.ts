import type { AttributeValue, WriteRequest } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  APDEX_T,
  type Apdex,
  type ApiMetricAggregate,
  type ApiMetricRecord,
  type DependencyOperationStats,
  type DependencyStats,
  type PercentileStats,
  type StatusCodeBreakdown,
} from '@tvseri.es/schemas';
import { buildLatencyHistogramBins } from '@tvseri.es/utils';
import type { ScheduledHandler } from 'aws-lambda';
import { compile, match } from 'path-to-regexp';
import { Resource } from 'sst';

const DYNAMO_BATCH_LIMIT = 25;
const AGGREGATE_TTL_DAYS = 30;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 100;
/** Number of shards used for raw metrics (must match metrics.ts) */
const SHARD_COUNT = 10;
/** Number of top items to store in leaderboards */
const TOP_ITEMS_LIMIT = 25;

/** Latency thresholds for ratings (in ms) */
const LATENCY_FAST_THRESHOLD = 200;
const LATENCY_MODERATE_THRESHOLD = 500;

/** TMDB sub-resource keywords that are valid (not IDs) */
const TMDB_KEYWORDS = new Set([
  'airing_today',
  'changes',
  'latest',
  'now_playing',
  'on_the_air',
  'popular',
  'top_rated',
  'upcoming',
]);

/** TMDB resources that require numeric IDs */
const TMDB_NUMERIC_ID_RESOURCES = new Set([
  'account',
  'collection',
  'company',
  'keyword',
  'list',
  'movie',
  'network',
  'person',
  'tv',
]);

/** TMDB resources that should have IDs normalized */
const TMDB_ID_RESOURCES = new Set([
  'account',
  'collection',
  'company',
  'credit',
  'keyword',
  'list',
  'movie',
  'network',
  'person',
  'review',
  'tv',
]);

/** MDBList supported ID providers */
const MDBLIST_PROVIDERS = new Set(['imdb', 'mal', 'tmdb', 'trakt', 'tvdb']);

/** MDBList supported media types */
const MDBLIST_MEDIA_TYPES = new Set(['any', 'movie', 'show']);

const dynamoClient = new DynamoDBClient({});

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════════════════
// PATH-TO-REGEXP MATCHERS AND TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

const compileOpts = { encode: false } as const;

const tmdbValidationMatcher = match<{
  id: string;
  path?: string[];
  resource: string;
}>('/3/:resource/:id{/*path}', { decode: decodeURIComponent });

type PatternParams = Record<string, string | undefined>;
type PatternTransform = (
  params: PatternParams,
) => Record<string, string> | null;

type NormalizationPattern = {
  matcher: ReturnType<typeof match>;
  template: ReturnType<typeof compile>;
  transform: PatternTransform;
};

const hasResource = (set: Set<string>, value: string | undefined): boolean =>
  value !== undefined && set.has(value);

const isNumeric = (value: string | undefined): boolean =>
  value !== undefined && /^\d+$/.test(value);

const tmdbNormalizationPatterns: NormalizationPattern[] = [
  {
    matcher: match('/3/:resource/:id/season/:season/episode/:episode/:sub'),
    template: compile(
      '/3/:resource/:id/season/:season/episode/:episode/:sub',
      compileOpts,
    ),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, episode: ':num', id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/season/:season/episode/:episode'),
    template: compile(
      '/3/:resource/:id/season/:season/episode/:episode',
      compileOpts,
    ),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, episode: ':num', id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/season/:season/:sub'),
    template: compile('/3/:resource/:id/season/:season/:sub', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/season/:season'),
    template: compile('/3/:resource/:id/season/:season', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id', season: ':num' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/:sub/:subsub'),
    template: compile('/3/:resource/:id/:sub/:subsub', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id' }
        : null,
  },
  {
    matcher: match('/3/:resource/:id/:sub'),
    template: compile('/3/:resource/:id/:sub', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id' }
        : null,
  },
  {
    matcher: match('/3/find/:id'),
    template: compile('/3/find/:id', compileOpts),
    transform: () => ({ id: ':id' }),
  },
  {
    matcher: match('/3/:resource/:id'),
    template: compile('/3/:resource/:id', compileOpts),
    transform: (params) =>
      hasResource(TMDB_ID_RESOURCES, params.resource)
        ? { ...params, id: ':id' }
        : null,
  },
];

const mdblistNormalizationPatterns: NormalizationPattern[] = [
  {
    matcher: match('/lists/:user/:list/items'),
    template: compile('/lists/:user/:list/items', compileOpts),
    transform: (params) =>
      isNumeric(params.user) ? null : { list: ':list', user: ':user' },
  },
  {
    matcher: match('/lists/:id/items'),
    template: compile('/lists/:id/items', compileOpts),
    transform: (params) => (isNumeric(params.id) ? { id: ':id' } : null),
  },
  {
    matcher: match('/lists/user/:id'),
    template: compile('/lists/user/:id', compileOpts),
    transform: (params) =>
      isNumeric(params.id) ? { id: ':id' } : { id: ':username' },
  },
  {
    matcher: match('/lists/:user/:list'),
    template: compile('/lists/:user/:list', compileOpts),
    transform: (params) =>
      isNumeric(params.user) ? null : { list: ':list', user: ':user' },
  },
  {
    matcher: match('/lists/:id'),
    template: compile('/lists/:id', compileOpts),
    transform: (params) => (isNumeric(params.id) ? { id: ':id' } : null),
  },
  {
    matcher: match('/external/lists/:id'),
    template: compile('/external/lists/:id', compileOpts),
    transform: (params) => (isNumeric(params.id) ? { id: ':id' } : null),
  },
  {
    matcher: match('/:provider/:mediaType/:id'),
    template: compile('/:provider/:mediaType/:id', compileOpts),
    transform: (params) =>
      hasResource(MDBLIST_PROVIDERS, params.provider) &&
      hasResource(MDBLIST_MEDIA_TYPES, params.mediaType)
        ? { ...params, id: ':id' }
        : null,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION AND NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const isValidTmdbEndpoint = (endpoint: string): boolean => {
  const result = tmdbValidationMatcher(endpoint);
  if (!result) return true;

  const { id, resource } = result.params;
  if (!TMDB_NUMERIC_ID_RESOURCES.has(resource)) return true;
  if (/^\d+$/.test(id)) return true;
  if (TMDB_KEYWORDS.has(id.toLowerCase())) return true;

  return false;
};

const normalizeTmdbEndpoint = (endpoint: string): string => {
  for (const { matcher, template, transform } of tmdbNormalizationPatterns) {
    const result = matcher(endpoint);
    if (result) {
      const params = transform(result.params as Record<string, string>);
      if (params) return template(params);
    }
  }
  return endpoint;
};

const normalizeMdblistEndpoint = (endpoint: string): string => {
  for (const { matcher, template, transform } of mdblistNormalizationPatterns) {
    const result = matcher(endpoint);
    if (result) {
      const params = transform(result.params as Record<string, string>);
      if (params) return template(params);
    }
  }
  return endpoint;
};

const normalizeDependencyEndpoint = (
  source: string,
  endpoint: string,
): string => {
  const normalizedSource = source.toLowerCase();

  if (normalizedSource === 'dynamodb') return endpoint;
  if (normalizedSource === 'tmdb') return normalizeTmdbEndpoint(endpoint);
  if (normalizedSource === 'mdblist') return normalizeMdblistEndpoint(endpoint);

  return endpoint;
};

/**
 * Calculate percentile statistics from an array of numbers.
 * Includes histogram bins for accurate multi-day aggregation.
 */
const calculatePercentiles = (values: number[]): PercentileStats => {
  if (values.length === 0) {
    return {
      count: 0,
      histogram: { bins: [] },
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      ratings: { fast: 0, moderate: 0, slow: 0 },
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;

  const percentile = (p: number): number => {
    const index = Math.ceil((p / 100) * count) - 1;
    return sorted[Math.max(0, index)] as number;
  };

  // Calculate latency ratings
  let fast = 0;
  let moderate = 0;
  let slow = 0;
  for (const value of values) {
    if (value < LATENCY_FAST_THRESHOLD) {
      fast++;
    } else if (value < LATENCY_MODERATE_THRESHOLD) {
      moderate++;
    } else {
      slow++;
    }
  }

  return {
    count,
    histogram: { bins: buildLatencyHistogramBins(values) },
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    ratings: { fast, moderate, slow },
  };
};

/**
 * Fetch all raw API metrics for a specific day from a single shard.
 */
const fetchRawMetricsFromShard = async (
  pk: string,
  dayStart: string,
  dayEnd: string,
): Promise<ApiMetricRecord[]> => {
  const items: ApiMetricRecord[] = [];
  let lastKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new QueryCommand({
        ExclusiveStartKey: lastKey,
        ExpressionAttributeNames: {
          '#pk': 'pk',
          '#sk': 'sk',
        },
        ExpressionAttributeValues: marshall({
          ':dayEnd': dayEnd,
          ':dayStart': dayStart,
          ':pk': pk,
        }),
        KeyConditionExpression:
          '#pk = :pk AND #sk BETWEEN :dayStart AND :dayEnd',
        TableName: Resource.MetricsRaw.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as ApiMetricRecord),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Fetch all raw API metrics for a specific day from all shards.
 */
const fetchRawMetrics = async (
  basePk: string,
  dayStart: string,
  dayEnd: string,
): Promise<ApiMetricRecord[]> => {
  // Query all shards in parallel
  const shardQueries = Array.from({ length: SHARD_COUNT }, (_, shard) =>
    fetchRawMetricsFromShard(`${basePk}#${shard}`, dayStart, dayEnd),
  );

  const results = await Promise.all(shardQueries);
  return results.flat();
};

/**
 * Classify status code into category.
 */
const classifyStatusCode = (
  code: number,
): 'success' | 'redirect' | 'clientError' | 'serverError' => {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'clientError';
  return 'serverError';
};

/**
 * Calculate Apdex (Application Performance Index) from latency values.
 *
 * Apdex is an open standard that measures user satisfaction:
 * - Satisfied: latency ≤ T
 * - Tolerating: T < latency ≤ 4T
 * - Frustrated: latency > 4T
 *
 * Score = (satisfied + tolerating × 0.5) / total
 */
const calculateApdex = (latencies: number[]): Apdex => {
  if (latencies.length === 0) {
    return { frustrated: 0, satisfied: 0, score: 1, tolerating: 0 };
  }

  const fourT = APDEX_T * 4;
  let satisfied = 0;
  let tolerating = 0;
  let frustrated = 0;

  for (const latency of latencies) {
    if (latency <= APDEX_T) {
      satisfied++;
    } else if (latency <= fourT) {
      tolerating++;
    } else {
      frustrated++;
    }
  }

  const total = latencies.length;
  const score = (satisfied + tolerating * 0.5) / total;

  return {
    frustrated,
    satisfied,
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    tolerating,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregate API metrics into MetricsApi table.
 *
 * KEY DESIGN: Filters in pk, dimension in sk
 *
 * pk patterns:
 *   "<date>"                    → No filters
 *   "<date>#P#<platform>"       → Platform filter
 *   "<date>#C#<country>"        → Country filter
 *   "<date>#P#<platform>#C#<country>" → Platform + Country filter
 *
 * sk patterns:
 *   "SUMMARY"             → Totals for this filter combo
 *   "E#<method> <route>"  → Endpoint metrics (e.g., "E#GET /tv/:id")
 *   "P#<platform>"        → Platform metrics (when pk has no platform filter)
 *   "C#<country>"         → Country metrics (when pk has no country filter)
 */
const aggregateApiMetrics = (
  records: ApiMetricRecord[],
  date: string,
): ApiMetricAggregate[] => {
  if (records.length === 0) return [];

  const expiresAt =
    Math.floor(Date.now() / 1000) + AGGREGATE_TTL_DAYS * 24 * 60 * 60;

  // ─────────────────────────────────────────────────────────────────────────
  // Helper functions
  // ─────────────────────────────────────────────────────────────────────────

  const createStatusBreakdown = (
    recs: ApiMetricRecord[],
  ): StatusCodeBreakdown => {
    const breakdown: StatusCodeBreakdown = {
      clientError: 0,
      codes: {},
      redirect: 0,
      serverError: 0,
      success: 0,
    };
    for (const rec of recs) {
      // Category totals
      breakdown[classifyStatusCode(rec.statusCode)]++;
      // Individual code counts
      const codeKey = String(rec.statusCode);
      breakdown.codes![codeKey] = (breakdown.codes![codeKey] ?? 0) + 1;
    }
    return breakdown;
  };

  const calculateErrorRate = (breakdown: StatusCodeBreakdown): number => {
    const total =
      breakdown.success +
      breakdown.redirect +
      breakdown.clientError +
      breakdown.serverError;
    if (total === 0) return 0;
    return (breakdown.clientError + breakdown.serverError) / total;
  };

  const aggregateDependencies = (
    recs: ApiMetricRecord[],
  ): Record<string, DependencyStats> => {
    const depsBySource = new Map<
      string,
      {
        durations: number[];
        errorCount: number;
        byOperation: Map<
          string,
          {
            codes: Map<number, number>;
            durations: number[];
            errorCount: number;
          }
        >;
      }
    >();

    for (const rec of recs) {
      for (const dep of rec.dependencies) {
        const isError = dep.status >= 400 || dep.error !== undefined;

        if (
          dep.source.toLowerCase() === 'tmdb' &&
          !isValidTmdbEndpoint(dep.endpoint)
        ) {
          continue;
        }

        const normalizedOp = normalizeDependencyEndpoint(
          dep.source,
          dep.endpoint,
        );

        let sourceData = depsBySource.get(dep.source);
        if (!sourceData) {
          sourceData = {
            byOperation: new Map(),
            durations: [],
            errorCount: 0,
          };
          depsBySource.set(dep.source, sourceData);
        }

        sourceData.durations.push(dep.duration);
        if (isError) sourceData.errorCount++;

        let opData = sourceData.byOperation.get(normalizedOp);
        if (!opData) {
          opData = { codes: new Map(), durations: [], errorCount: 0 };
          sourceData.byOperation.set(normalizedOp, opData);
        }
        opData.durations.push(dep.duration);
        if (isError) opData.errorCount++;
        opData.codes.set(dep.status, (opData.codes.get(dep.status) ?? 0) + 1);
      }
    }

    const result: Record<string, DependencyStats> = {};
    for (const [
      source,
      { durations, errorCount, byOperation },
    ] of depsBySource) {
      const percentiles = calculatePercentiles(durations);
      const count = durations.length;
      const throughput = count > 0 ? Math.round((count / 1440) * 100) / 100 : 0;

      const topOperations: DependencyOperationStats[] = [
        ...byOperation.entries(),
      ]
        .map(([operation, opData]) => {
          const opCount = opData.durations.length;
          const sorted = [...opData.durations].sort((a, b) => a - b);
          const percentile = (p: number): number => {
            const index = Math.ceil((p / 100) * opCount) - 1;
            return sorted[Math.max(0, index)] ?? 0;
          };

          const codes: Record<string, number> = {};
          for (const [status, count] of opData.codes) {
            codes[String(status)] = count;
          }

          return {
            codes,
            count: opCount,
            errorCount: opData.errorCount,
            errorRate:
              opCount > 0
                ? Math.round((opData.errorCount / opCount) * 10000) / 100
                : 0,
            histogram: { bins: buildLatencyHistogramBins(opData.durations) },
            operation,
            p75: percentile(75),
            p90: percentile(90),
            p95: percentile(95),
            p99: percentile(99),
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_ITEMS_LIMIT);

      result[source] = {
        ...percentiles,
        errorCount,
        errorRate:
          count > 0 ? Math.round((errorCount / count) * 10000) / 100 : 0,
        throughput,
        topOperations,
      };
    }
    return result;
  };

  /**
   * Build top endpoints leaderboard from a map of endpoint -> records.
   */
  const buildTopEndpoints = (
    endpointMap: Map<string, ApiMetricRecord[]>,
  ): Array<{
    apdexScore: number;
    dependencyNames: string[];
    endpoint: string;
    errorCount: number;
    errorRate: number;
    histogram: { bins: number[] };
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    requestCount: number;
  }> => {
    return [...endpointMap.entries()]
      .map(([endpoint, recs]) => {
        const latencies = recs.map((r) => r.latency);
        const sorted = [...latencies].sort((a, b) => a - b);
        const count = sorted.length;

        const percentile = (p: number): number => {
          const index = Math.ceil((p / 100) * count) - 1;
          return sorted[Math.max(0, index)] ?? 0;
        };

        const apdex = calculateApdex(latencies);
        const errorCount = recs.filter((r) => r.statusCode >= 400).length;
        const errorRate =
          count > 0 ? Math.round((errorCount / count) * 10000) / 100 : 0;

        // Collect unique dependency names
        const depNames = new Set<string>();
        for (const rec of recs) {
          for (const dep of rec.dependencies) {
            depNames.add(dep.source);
          }
        }

        return {
          apdexScore: apdex.score,
          dependencyNames: [...depNames].sort(),
          endpoint,
          errorCount,
          errorRate,
          histogram: { bins: buildLatencyHistogramBins(latencies) },
          p75: percentile(75),
          p90: percentile(90),
          p95: percentile(95),
          p99: percentile(99),
          requestCount: count,
        };
      })
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, TOP_ITEMS_LIMIT);
  };

  /**
   * Calculate top countries for an endpoint.
   * Groups records by country and returns top N by request count.
   */
  const calculateTopCountries = (
    recs: ApiMetricRecord[],
  ): Array<{
    country: string;
    errorCount: number;
    errorRate: number;
    histogram: { bins: number[] };
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    requestCount: number;
  }> => {
    const byCountry = new Map<string, ApiMetricRecord[]>();

    for (const rec of recs) {
      const existing = byCountry.get(rec.country);
      if (existing) {
        existing.push(rec);
      } else {
        byCountry.set(rec.country, [rec]);
      }
    }

    return [...byCountry.entries()]
      .map(([country, countryRecs]) => {
        const latencies = countryRecs.map((r) => r.latency);
        const sorted = [...latencies].sort((a, b) => a - b);
        const count = sorted.length;

        const percentile = (p: number): number => {
          const index = Math.ceil((p / 100) * count) - 1;
          return sorted[Math.max(0, index)] ?? 0;
        };

        const errorCount = countryRecs.filter(
          (r) => r.statusCode >= 400,
        ).length;
        const errorRate =
          count > 0 ? Math.round((errorCount / count) * 10000) / 100 : 0;

        return {
          country,
          errorCount,
          errorRate,
          histogram: { bins: buildLatencyHistogramBins(latencies) },
          p75: percentile(75),
          p90: percentile(90),
          p95: percentile(95),
          p99: percentile(99),
          requestCount: count,
        };
      })
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, TOP_ITEMS_LIMIT);
  };

  const createAggregate = (
    recs: ApiMetricRecord[],
    pk: string,
    sk: string,
    gsiKeys?: Partial<
      Pick<
        ApiMetricAggregate,
        'GSI1PK' | 'GSI1SK' | 'GSI2PK' | 'GSI2SK' | 'GSI3PK' | 'GSI3SK'
      >
    >,
    extras?: Partial<
      Pick<ApiMetricAggregate, 'dependencies' | 'topCountries' | 'topEndpoints'>
    >,
  ): ApiMetricAggregate => {
    const latencies = recs.map((r) => r.latency);
    const statusCodes = createStatusBreakdown(recs);

    return {
      apdex: calculateApdex(latencies),
      date,
      errorRate: calculateErrorRate(statusCodes),
      expiresAt,
      latency: calculatePercentiles(latencies),
      pk,
      requestCount: recs.length,
      sk,
      statusCodes,
      type: 'api-aggregate',
      ...gsiKeys,
      ...extras,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Group records by dimensions
  // ─────────────────────────────────────────────────────────────────────────

  // Single dimensions
  const byEndpoint = new Map<string, ApiMetricRecord[]>();
  const byPlatform = new Map<string, ApiMetricRecord[]>();
  const byCountry = new Map<string, ApiMetricRecord[]>();

  // 2-way combos
  const byPlatformCountry = new Map<string, ApiMetricRecord[]>();
  const byPlatformEndpoint = new Map<string, ApiMetricRecord[]>();
  const byCountryEndpoint = new Map<string, ApiMetricRecord[]>();

  // 3-way combo
  const byPlatformCountryEndpoint = new Map<string, ApiMetricRecord[]>();

  for (const rec of records) {
    const endpoint = `${rec.method} ${rec.route}`;
    const platform = rec.client.platform;
    const country = rec.country;

    // Single dimensions
    (
      byEndpoint.get(endpoint) ?? byEndpoint.set(endpoint, []).get(endpoint)
    )?.push(rec);
    (
      byPlatform.get(platform) ?? byPlatform.set(platform, []).get(platform)
    )?.push(rec);
    (byCountry.get(country) ?? byCountry.set(country, []).get(country))?.push(
      rec,
    );

    // 2-way combos
    const pcKey = `${platform}#${country}`;
    (
      byPlatformCountry.get(pcKey) ??
      byPlatformCountry.set(pcKey, []).get(pcKey)
    )?.push(rec);

    const peKey = `${platform}#${endpoint}`;
    (
      byPlatformEndpoint.get(peKey) ??
      byPlatformEndpoint.set(peKey, []).get(peKey)
    )?.push(rec);

    const ceKey = `${country}#${endpoint}`;
    (
      byCountryEndpoint.get(ceKey) ??
      byCountryEndpoint.set(ceKey, []).get(ceKey)
    )?.push(rec);

    // 3-way combo
    const pceKey = `${platform}#${country}#${endpoint}`;
    (
      byPlatformCountryEndpoint.get(pceKey) ??
      byPlatformCountryEndpoint.set(pceKey, []).get(pceKey)
    )?.push(rec);
  }

  const aggregates: ApiMetricAggregate[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>" (no filters)
  // ─────────────────────────────────────────────────────────────────────────

  // Build top endpoints leaderboard (sorted by request count)
  const topEndpoints = buildTopEndpoints(byEndpoint);

  // SUMMARY - overall stats for the day
  aggregates.push(
    createAggregate(records, date, 'SUMMARY', undefined, {
      dependencies: aggregateDependencies(records),
      topEndpoints,
    }),
  );

  // Endpoints (sk: E#<endpoint>)
  for (const [endpoint, recs] of byEndpoint) {
    aggregates.push(
      createAggregate(
        recs,
        date,
        `E#${endpoint}`,
        {
          GSI1PK: `E#${endpoint}`,
          GSI1SK: date,
        },
        {
          dependencies: aggregateDependencies(recs),
          topCountries: calculateTopCountries(recs),
        },
      ),
    );
  }

  // Platforms (sk: P#<platform>)
  for (const [platform, recs] of byPlatform) {
    aggregates.push(
      createAggregate(recs, date, `P#${platform}`, {
        GSI2PK: `P#${platform}`,
        GSI2SK: date,
      }),
    );
  }

  // Countries (sk: C#<country>)
  for (const [country, recs] of byCountry) {
    aggregates.push(
      createAggregate(recs, date, `C#${country}`, {
        GSI3PK: `C#${country}`,
        GSI3SK: date,
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>#P#<platform>" (platform filter)
  // ─────────────────────────────────────────────────────────────────────────

  for (const [platform, platformRecs] of byPlatform) {
    const pk = `${date}#P#${platform}`;

    // Build top endpoints for this platform
    const platformEndpointMap = new Map<string, ApiMetricRecord[]>();
    for (const [key, recs] of byPlatformEndpoint) {
      if (key.startsWith(`${platform}#`)) {
        const endpoint = key.split('#').slice(1).join('#');
        platformEndpointMap.set(endpoint, recs);
      }
    }
    const platformEndpoints = buildTopEndpoints(platformEndpointMap);

    // SUMMARY for this platform
    aggregates.push(
      createAggregate(platformRecs, pk, 'SUMMARY', undefined, {
        dependencies: aggregateDependencies(platformRecs),
        topEndpoints: platformEndpoints,
      }),
    );

    // Endpoints for this platform
    for (const [peKey, recs] of byPlatformEndpoint) {
      const [keyPlatform, ...rest] = peKey.split('#');
      const keyEndpoint = rest.join('#');
      if (keyPlatform === platform) {
        aggregates.push(
          createAggregate(recs, pk, `E#${keyEndpoint}`, undefined, {
            dependencies: aggregateDependencies(recs),
            topCountries: calculateTopCountries(recs),
          }),
        );
      }
    }

    // Countries for this platform
    for (const [pcKey, recs] of byPlatformCountry) {
      const [keyPlatform, keyCountry] = pcKey.split('#') as [string, string];
      if (keyPlatform === platform) {
        aggregates.push(createAggregate(recs, pk, `C#${keyCountry}`));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>#C#<country>" (country filter)
  // ─────────────────────────────────────────────────────────────────────────

  for (const [country, countryRecs] of byCountry) {
    const pk = `${date}#C#${country}`;

    // Build top endpoints for this country
    const countryEndpointMap = new Map<string, ApiMetricRecord[]>();
    for (const [key, recs] of byCountryEndpoint) {
      if (key.startsWith(`${country}#`)) {
        const endpoint = key.split('#').slice(1).join('#');
        countryEndpointMap.set(endpoint, recs);
      }
    }
    const countryEndpoints = buildTopEndpoints(countryEndpointMap);

    // SUMMARY for this country
    aggregates.push(
      createAggregate(countryRecs, pk, 'SUMMARY', undefined, {
        dependencies: aggregateDependencies(countryRecs),
        topEndpoints: countryEndpoints,
      }),
    );

    // Endpoints for this country
    for (const [ceKey, recs] of byCountryEndpoint) {
      const [keyCountry, ...rest] = ceKey.split('#');
      const keyEndpoint = rest.join('#');
      if (keyCountry === country) {
        aggregates.push(
          createAggregate(recs, pk, `E#${keyEndpoint}`, undefined, {
            dependencies: aggregateDependencies(recs),
          }),
        );
      }
    }

    // Platforms for this country
    for (const [pcKey, recs] of byPlatformCountry) {
      const [keyPlatform, keyCountry] = pcKey.split('#') as [string, string];
      if (keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `P#${keyPlatform}`));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>#P#<platform>#C#<country>" (platform + country filter)
  // ─────────────────────────────────────────────────────────────────────────

  for (const [pcKey, pcRecs] of byPlatformCountry) {
    const [platform, country] = pcKey.split('#') as [string, string];
    const pk = `${date}#P#${platform}#C#${country}`;

    // Build top endpoints for this platform + country combo
    const pcEndpointMap = new Map<string, ApiMetricRecord[]>();
    for (const [key, recs] of byPlatformCountryEndpoint) {
      if (key.startsWith(`${platform}#${country}#`)) {
        const endpoint = key.split('#').slice(2).join('#');
        pcEndpointMap.set(endpoint, recs);
      }
    }
    const pcEndpoints = buildTopEndpoints(pcEndpointMap);

    // SUMMARY for this platform + country combo
    aggregates.push(
      createAggregate(pcRecs, pk, 'SUMMARY', undefined, {
        dependencies: aggregateDependencies(pcRecs),
        topEndpoints: pcEndpoints,
      }),
    );

    // Endpoints for this platform + country combo
    for (const [pceKey, recs] of byPlatformCountryEndpoint) {
      const [keyPlatform, keyCountry, ...rest] = pceKey.split('#');
      const keyEndpoint = rest.join('#');
      if (keyPlatform === platform && keyCountry === country) {
        aggregates.push(
          createAggregate(recs, pk, `E#${keyEndpoint}`, undefined, {
            dependencies: aggregateDependencies(recs),
          }),
        );
      }
    }
  }

  return aggregates;
};

// ═══════════════════════════════════════════════════════════════════════════
// WRITE TO DYNAMODB
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Write a batch of items to DynamoDB with exponential backoff retry for UnprocessedItems.
 */
const batchWriteWithRetry = async (
  tableName: string,
  items: WriteRequest[],
): Promise<void> => {
  let unprocessed = items;
  let attempt = 0;

  while (unprocessed.length > 0 && attempt < MAX_RETRIES) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * 2 ** attempt;
      await sleep(delay);
    }

    const result = await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: unprocessed,
        },
      }),
    );

    const remaining = result.UnprocessedItems?.[tableName];
    if (!remaining || remaining.length === 0) {
      return;
    }

    unprocessed = remaining;
    attempt++;
    console.warn(
      `[api-aggregate] ${unprocessed.length} unprocessed items, retry ${attempt}/${MAX_RETRIES}`,
    );
  }

  if (unprocessed.length > 0) {
    console.error(
      `[api-aggregate] Failed to write ${unprocessed.length} items after ${MAX_RETRIES} retries`,
    );
    throw new Error(
      `Failed to write ${unprocessed.length} items after ${MAX_RETRIES} retries`,
    );
  }
};

/**
 * Write API aggregates to MetricsApi table.
 */
const writeAggregates = async (items: ApiMetricAggregate[]): Promise<void> => {
  if (items.length === 0) return;

  const writeRequests: WriteRequest[] = items.map((item) => ({
    PutRequest: {
      Item: marshall(item, { removeUndefinedValues: true }),
    },
  }));

  // Split into DynamoDB batch chunks (max 25 items per batch)
  const batches: WriteRequest[][] = [];
  for (let i = 0; i < writeRequests.length; i += DYNAMO_BATCH_LIMIT) {
    batches.push(writeRequests.slice(i, i + DYNAMO_BATCH_LIMIT));
  }

  await Promise.all(
    batches.map((batch) =>
      batchWriteWithRetry(Resource.MetricsApiAggregated.name, batch),
    ),
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LAMBDA HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * API metrics aggregation Lambda.
 * Runs daily to aggregate raw API metrics into pre-computed aggregates.
 *
 * By default, aggregates the PREVIOUS day's data to ensure all metrics are collected.
 * Can also accept a specific date via event payload for manual runs:
 *   { "date": "2025-12-11" }
 */
export const handler: ScheduledHandler = async (event) => {
  const now = new Date();

  // Allow overriding date via event payload for manual runs/testing
  const eventDate =
    event && typeof event === 'object' && 'date' in event
      ? (event as { date: string }).date
      : null;

  let dateStr: string;
  if (eventDate) {
    dateStr = eventDate;
    console.log(`[api-aggregate] Using provided date: ${dateStr}`);
  } else {
    // Calculate the previous day's date
    const previousDay = new Date(now);
    previousDay.setDate(previousDay.getDate() - 1);
    dateStr = previousDay.toISOString().split('T')[0] as string;
  }

  // Time range for the full day
  // Note: sk format is "{timestamp}#{requestId}", so we use ~ suffix to capture all records
  // since ~ (ASCII 126) sorts after alphanumeric characters
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z~`;

  console.log(`[api-aggregate] Processing date ${dateStr}`);

  // Fetch raw API metrics
  const rawMetrics = await fetchRawMetrics(`API#${dateStr}`, dayStart, dayEnd);
  console.log(`[api-aggregate] Found ${rawMetrics.length} raw metrics`);

  if (rawMetrics.length === 0) {
    console.log('[api-aggregate] No metrics to aggregate');
    return;
  }

  // Aggregate
  const aggregates = aggregateApiMetrics(rawMetrics, dateStr);
  console.log(`[api-aggregate] Created ${aggregates.length} aggregates`);

  // Write to table
  await writeAggregates(aggregates);

  console.log('[api-aggregate] Done');
};
