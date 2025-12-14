import type { AttributeValue, WriteRequest } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  ApiMetricAggregate,
  ApiMetricRecord,
  PercentileStats,
  StatusCodeBreakdown,
} from '@tvseri.es/schemas';
import { buildLatencyHistogramBins } from '@tvseri.es/utils';
import type { ScheduledHandler } from 'aws-lambda';
import { Resource } from 'sst';

const DYNAMO_BATCH_LIMIT = 25;
const AGGREGATE_TTL_DAYS = 30;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 100;
/** Number of shards used for raw metrics (must match metrics.ts) */
const SHARD_COUNT = 10;

const dynamoClient = new DynamoDBClient({});

/**
 * Sleep for a given number of milliseconds.
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

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
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;

  const percentile = (p: number): number => {
    const index = Math.ceil((p / 100) * count) - 1;
    return sorted[Math.max(0, index)] as number;
  };

  return {
    count,
    histogram: { bins: buildLatencyHistogramBins(values) },
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
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

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregate API metrics into MetricsApi table.
 *
 * KEY DESIGN: Filters in pk, dimension in sk
 *
 * pk patterns:
 *   "<date>"              → No filters
 *   "<date>#P#<platform>" → Platform filter
 *
 * sk patterns:
 *   "SUMMARY"             → Totals for this filter combo
 *   "R#<route>"           → Route metrics
 *   "E#<method> <route>"  → Endpoint metrics (method + route)
 *   "S#<category>"        → Status category metrics (2xx, 4xx, 5xx)
 *   "P#<platform>"        → Platform metrics (when pk has no platform filter)
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
      redirect: 0,
      serverError: 0,
      success: 0,
    };
    for (const rec of recs) {
      breakdown[classifyStatusCode(rec.statusCode)]++;
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
  ): Record<string, PercentileStats> => {
    const depsBySource = new Map<string, number[]>();
    for (const rec of recs) {
      for (const dep of rec.dependencies) {
        const existing = depsBySource.get(dep.source);
        if (existing) {
          existing.push(dep.duration);
        } else {
          depsBySource.set(dep.source, [dep.duration]);
        }
      }
    }
    const result: Record<string, PercentileStats> = {};
    for (const [source, durations] of depsBySource) {
      result[source] = calculatePercentiles(durations);
    }
    return result;
  };

  const createAggregate = (
    recs: ApiMetricRecord[],
    pk: string,
    sk: string,
    gsiKeys?: Partial<
      Pick<
        ApiMetricAggregate,
        | 'GSI1PK'
        | 'GSI1SK'
        | 'GSI2PK'
        | 'GSI2SK'
        | 'GSI3PK'
        | 'GSI3SK'
        | 'GSI4PK'
        | 'GSI4SK'
      >
    >,
    extras?: Partial<
      Pick<
        ApiMetricAggregate,
        | 'dependencies'
        | 'topEndpoints'
        | 'topErrors'
        | 'topRoutes'
        | 'topSlowest'
      >
    >,
  ): ApiMetricAggregate => {
    const latencies = recs.map((r) => r.latency);
    const statusCodes = createStatusBreakdown(recs);

    return {
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

  const byRoute = new Map<string, ApiMetricRecord[]>();
  const byEndpoint = new Map<string, ApiMetricRecord[]>();
  const byStatusCategory = new Map<string, ApiMetricRecord[]>();
  const byPlatform = new Map<string, ApiMetricRecord[]>();

  // Cross-filters with platform
  const byPlatformRoute = new Map<string, ApiMetricRecord[]>();
  const byPlatformEndpoint = new Map<string, ApiMetricRecord[]>();
  const byPlatformStatus = new Map<string, ApiMetricRecord[]>();

  for (const rec of records) {
    const route = rec.route;
    const method = rec.method;
    const endpoint = `${method} ${route}`;
    const platform = rec.client.platform;
    const statusCat =
      rec.statusCode >= 500
        ? '5xx'
        : rec.statusCode >= 400
          ? '4xx'
          : rec.statusCode >= 300
            ? '3xx'
            : '2xx';

    // Single dimensions
    (byRoute.get(route) ?? byRoute.set(route, []).get(route))?.push(rec);
    (
      byEndpoint.get(endpoint) ?? byEndpoint.set(endpoint, []).get(endpoint)
    )?.push(rec);
    (
      byStatusCategory.get(statusCat) ??
      byStatusCategory.set(statusCat, []).get(statusCat)
    )?.push(rec);
    (
      byPlatform.get(platform) ?? byPlatform.set(platform, []).get(platform)
    )?.push(rec);

    // Platform cross-filters
    const prKey = `${platform}#${route}`;
    (
      byPlatformRoute.get(prKey) ?? byPlatformRoute.set(prKey, []).get(prKey)
    )?.push(rec);

    const peKey = `${platform}#${endpoint}`;
    (
      byPlatformEndpoint.get(peKey) ??
      byPlatformEndpoint.set(peKey, []).get(peKey)
    )?.push(rec);

    const psKey = `${platform}#${statusCat}`;
    (
      byPlatformStatus.get(psKey) ?? byPlatformStatus.set(psKey, []).get(psKey)
    )?.push(rec);
  }

  const aggregates: ApiMetricAggregate[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>" (no filters)
  // ─────────────────────────────────────────────────────────────────────────

  // Build leaderboards for SUMMARY
  const routeStats: Array<{
    count: number;
    errorRate: number;
    p75: number;
    p99: number;
    route: string;
  }> = [];
  for (const [route, recs] of byRoute) {
    const agg = createAggregate(recs, '', '');
    routeStats.push({
      count: agg.requestCount,
      errorRate: agg.errorRate,
      p75: agg.latency.p75,
      p99: agg.latency.p99,
      route,
    });
  }

  const endpointStats: Array<{
    count: number;
    endpoint: string;
    errorRate: number;
    p75: number;
  }> = [];
  for (const [endpoint, recs] of byEndpoint) {
    const agg = createAggregate(recs, '', '');
    endpointStats.push({
      count: agg.requestCount,
      endpoint,
      errorRate: agg.errorRate,
      p75: agg.latency.p75,
    });
  }

  // SUMMARY
  aggregates.push(
    createAggregate(records, date, 'SUMMARY', undefined, {
      dependencies: aggregateDependencies(records),
      topEndpoints: endpointStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topErrors: routeStats
        .filter((r) => r.count >= 10)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 10)
        .map((r) => ({
          count: r.count,
          errorRate: r.errorRate,
          route: r.route,
        })),
      topRoutes: [...routeStats]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((r) => ({
          count: r.count,
          errorRate: r.errorRate,
          p75: r.p75,
          route: r.route,
        })),
      topSlowest: routeStats
        .filter((r) => r.count >= 10)
        .sort((a, b) => b.p75 - a.p75)
        .slice(0, 10)
        .map((r) => ({
          count: r.count,
          p75: r.p75,
          p99: r.p99,
          route: r.route,
        })),
    }),
  );

  // Routes (sk: R#<route>)
  for (const [route, recs] of byRoute) {
    aggregates.push(
      createAggregate(
        recs,
        date,
        `R#${route}`,
        {
          GSI1PK: `R#${route}`,
          GSI1SK: date,
        },
        {
          dependencies: aggregateDependencies(recs),
        },
      ),
    );
  }

  // Endpoints (sk: E#<method> <route>)
  for (const [endpoint, recs] of byEndpoint) {
    aggregates.push(
      createAggregate(recs, date, `E#${endpoint}`, {
        GSI3PK: `E#${endpoint}`,
        GSI3SK: date,
      }),
    );
  }

  // Status categories (sk: S#<category>)
  for (const [category, recs] of byStatusCategory) {
    aggregates.push(
      createAggregate(recs, date, `S#${category}`, {
        GSI2PK: `S#${category}`,
        GSI2SK: date,
      }),
    );
  }

  // Platforms (sk: P#<platform>)
  for (const [platform, recs] of byPlatform) {
    aggregates.push(
      createAggregate(recs, date, `P#${platform}`, {
        GSI4PK: `P#${platform}`,
        GSI4SK: date,
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>#P#<platform>" (platform filter)
  // ─────────────────────────────────────────────────────────────────────────

  for (const [platform, platformRecs] of byPlatform) {
    const pk = `${date}#P#${platform}`;

    // SUMMARY for this platform
    aggregates.push(
      createAggregate(platformRecs, pk, 'SUMMARY', undefined, {
        dependencies: aggregateDependencies(platformRecs),
      }),
    );

    // Routes for this platform
    for (const [prKey, recs] of byPlatformRoute) {
      const [keyPlatform, keyRoute] = prKey.split('#') as [string, string];
      if (keyPlatform === platform) {
        aggregates.push(createAggregate(recs, pk, `R#${keyRoute}`));
      }
    }

    // Endpoints for this platform
    for (const [peKey, recs] of byPlatformEndpoint) {
      const [keyPlatform, keyEndpoint] = peKey.split('#') as [string, string];
      if (keyPlatform === platform) {
        aggregates.push(createAggregate(recs, pk, `E#${keyEndpoint}`));
      }
    }

    // Status categories for this platform
    for (const [psKey, recs] of byPlatformStatus) {
      const [keyPlatform, keyCategory] = psKey.split('#') as [string, string];
      if (keyPlatform === platform) {
        aggregates.push(createAggregate(recs, pk, `S#${keyCategory}`));
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
      batchWriteWithRetry(Resource.MetricsApi.name, batch),
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
