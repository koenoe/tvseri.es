import type { AttributeValue, WriteRequest } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  WebVitalAggregate,
  WebVitalMetricStats,
  WebVitalName,
  WebVitalRatings,
  WebVitalRecord,
  WebVitalTopItem,
} from '@tvseri.es/schemas';
import { buildHistogramBins, computeRESFromStats } from '@tvseri.es/utils';
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
 * Fetch all raw Web Vital metrics for a specific day from a single shard.
 */
const fetchRawMetricsFromShard = async (
  pk: string,
  dayStart: string,
  dayEnd: string,
): Promise<WebVitalRecord[]> => {
  const items: WebVitalRecord[] = [];
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
        ...result.Items.map((item) => unmarshall(item) as WebVitalRecord),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Fetch all raw Web Vital metrics for a specific day from all shards.
 */
const fetchRawMetrics = async (
  basePk: string,
  dayStart: string,
  dayEnd: string,
): Promise<WebVitalRecord[]> => {
  // Query all shards in parallel
  const shardQueries = Array.from({ length: SHARD_COUNT }, (_, shard) =>
    fetchRawMetricsFromShard(`${basePk}#${shard}`, dayStart, dayEnd),
  );

  const results = await Promise.all(shardQueries);
  return results.flat();
};

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregate Web Vital metrics into MetricsWebVitals table.
 *
 * KEY DESIGN: Filters in pk, dimension in sk
 *
 * pk patterns:
 *   "<date>"                         → No filters
 *   "<date>#D#<device>"              → Device filter
 *   "<date>#C#<country>"             → Country filter
 *   "<date>#D#<device>#C#<country>"  → Device + Country filter
 *
 * sk patterns:
 *   "SUMMARY"        → Totals for this filter combo
 *   "R#<route>"      → Route metrics
 *   "C#<country>"    → Country metrics (when pk has no country filter)
 *   "D#<device>"     → Device metrics (when pk has no device filter)
 */
const aggregateWebVitals = (
  records: WebVitalRecord[],
  date: string,
): WebVitalAggregate[] => {
  if (records.length === 0) return [];

  const expiresAt =
    Math.floor(Date.now() / 1000) + AGGREGATE_TTL_DAYS * 24 * 60 * 60;

  // ─────────────────────────────────────────────────────────────────────────
  // Helper functions
  // ─────────────────────────────────────────────────────────────────────────

  const createMetricStats = (
    recs: WebVitalRecord[],
    metricName: WebVitalName,
  ): WebVitalMetricStats => {
    const filtered = recs.filter((r) => r.name === metricName);
    const values = filtered.map((r) => r.value);
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    const percentile = (p: number): number => {
      if (count === 0) return 0;
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, index)] ?? 0;
    };

    const ratings: WebVitalRatings = { good: 0, needsImprovement: 0, poor: 0 };
    for (const rec of filtered) {
      if (rec.rating === 'good') ratings.good++;
      else if (rec.rating === 'needs-improvement') ratings.needsImprovement++;
      else ratings.poor++;
    }

    return {
      count,
      histogram: { bins: buildHistogramBins(values, metricName) },
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      ratings,
    };
  };

  const countPageviews = (recs: WebVitalRecord[]): number => {
    const uniqueIds = new Set(recs.map((r) => r.id));
    return uniqueIds.size;
  };

  const createAggregate = (
    recs: WebVitalRecord[],
    pk: string,
    sk: string,
    gsiKeys?: Partial<
      Pick<
        WebVitalAggregate,
        'GSI1PK' | 'GSI1SK' | 'GSI2PK' | 'GSI2SK' | 'GSI3PK' | 'GSI3SK'
      >
    >,
    extras?: Partial<Pick<WebVitalAggregate, 'topCountries' | 'topRoutes'>>,
  ): WebVitalAggregate => {
    const CLS = createMetricStats(recs, 'CLS');
    const FCP = createMetricStats(recs, 'FCP');
    const INP = createMetricStats(recs, 'INP');
    const LCP = createMetricStats(recs, 'LCP');
    const TTFB = createMetricStats(recs, 'TTFB');
    const stats = { CLS, FCP, INP, LCP, TTFB };

    // Calculate RES using Vercel's methodology:
    // - Uses p75 values (not ratings) for each metric
    // - Applies Lighthouse 10 log-normal scoring curves
    // - Weighted: LCP 30%, INP 30%, CLS 25%, FCP 15%
    // - TTFB is intentionally excluded from RES
    const score = computeRESFromStats(stats);

    return {
      CLS,
      date,
      expiresAt,
      FCP,
      INP,
      LCP,
      pageviews: countPageviews(recs),
      pk,
      score,
      sk,
      TTFB,
      type: 'web-vital-aggregate',
      ...gsiKeys,
      ...extras,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Group records by all dimension combinations
  // ─────────────────────────────────────────────────────────────────────────

  // Single dimensions
  const byRoute = new Map<string, WebVitalRecord[]>();
  const byCountry = new Map<string, WebVitalRecord[]>();
  const byDevice = new Map<string, WebVitalRecord[]>();

  // 2-way combos
  const byDeviceCountry = new Map<string, WebVitalRecord[]>();
  const byDeviceRoute = new Map<string, WebVitalRecord[]>();
  const byCountryRoute = new Map<string, WebVitalRecord[]>();

  // 3-way combo
  const byDeviceCountryRoute = new Map<string, WebVitalRecord[]>();

  for (const rec of records) {
    const route = rec.route;
    const country = rec.country;
    const device = rec.device.type;

    // Single dimensions
    (byRoute.get(route) ?? byRoute.set(route, []).get(route))?.push(rec);
    (byCountry.get(country) ?? byCountry.set(country, []).get(country))?.push(
      rec,
    );
    (byDevice.get(device) ?? byDevice.set(device, []).get(device))?.push(rec);

    // 2-way combos
    const dcKey = `${device}#${country}`;
    (
      byDeviceCountry.get(dcKey) ?? byDeviceCountry.set(dcKey, []).get(dcKey)
    )?.push(rec);

    const drKey = `${device}#${route}`;
    (byDeviceRoute.get(drKey) ?? byDeviceRoute.set(drKey, []).get(drKey))?.push(
      rec,
    );

    const crKey = `${country}#${route}`;
    (
      byCountryRoute.get(crKey) ?? byCountryRoute.set(crKey, []).get(crKey)
    )?.push(rec);

    // 3-way combo
    const dcrKey = `${device}#${country}#${route}`;
    (
      byDeviceCountryRoute.get(dcrKey) ??
      byDeviceCountryRoute.set(dcrKey, []).get(dcrKey)
    )?.push(rec);
  }

  const aggregates: WebVitalAggregate[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>" (no filters)
  // ─────────────────────────────────────────────────────────────────────────

  // Build topRoutes and topCountries for SUMMARY
  const topRoutes: WebVitalTopItem[] = [];
  for (const [route, recs] of byRoute) {
    const agg = createAggregate(recs, '', '');
    topRoutes.push({
      pageviews: agg.pageviews,
      score: agg.score,
      value: route,
    });
  }
  topRoutes.sort((a, b) => b.pageviews - a.pageviews);

  const topCountries: WebVitalTopItem[] = [];
  for (const [country, recs] of byCountry) {
    const agg = createAggregate(recs, '', '');
    topCountries.push({
      pageviews: agg.pageviews,
      score: agg.score,
      value: country,
    });
  }
  topCountries.sort((a, b) => b.pageviews - a.pageviews);

  // SUMMARY
  aggregates.push(
    createAggregate(records, date, 'SUMMARY', undefined, {
      topCountries: topCountries.slice(0, 25),
      topRoutes: topRoutes.slice(0, 25),
    }),
  );

  // Routes (sk: R#<route>)
  for (const [route, recs] of byRoute) {
    aggregates.push(
      createAggregate(recs, date, `R#${route}`, {
        GSI1PK: `R#${route}`,
        GSI1SK: date,
      }),
    );
  }

  // Countries (sk: C#<country>)
  for (const [country, recs] of byCountry) {
    aggregates.push(
      createAggregate(recs, date, `C#${country}`, {
        GSI2PK: `C#${country}`,
        GSI2SK: date,
      }),
    );
  }

  // Devices (sk: D#<device>)
  for (const [device, recs] of byDevice) {
    aggregates.push(
      createAggregate(recs, date, `D#${device}`, {
        GSI3PK: `D#${device}`,
        GSI3SK: date,
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>#D#<device>" (device filter)
  // ─────────────────────────────────────────────────────────────────────────

  for (const [device, deviceRecs] of byDevice) {
    const pk = `${date}#D#${device}`;

    // SUMMARY for this device
    aggregates.push(createAggregate(deviceRecs, pk, 'SUMMARY'));

    // Routes for this device
    for (const [drKey, recs] of byDeviceRoute) {
      const [keyDevice, keyRoute] = drKey.split('#') as [string, string];
      if (keyDevice === device) {
        aggregates.push(createAggregate(recs, pk, `R#${keyRoute}`));
      }
    }

    // Countries for this device
    for (const [dcKey, recs] of byDeviceCountry) {
      const [keyDevice, keyCountry] = dcKey.split('#') as [string, string];
      if (keyDevice === device) {
        aggregates.push(createAggregate(recs, pk, `C#${keyCountry}`));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>#C#<country>" (country filter)
  // ─────────────────────────────────────────────────────────────────────────

  for (const [country, countryRecs] of byCountry) {
    const pk = `${date}#C#${country}`;

    // SUMMARY for this country
    aggregates.push(createAggregate(countryRecs, pk, 'SUMMARY'));

    // Routes for this country
    for (const [crKey, recs] of byCountryRoute) {
      const [keyCountry, keyRoute] = crKey.split('#') as [string, string];
      if (keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `R#${keyRoute}`));
      }
    }

    // Devices for this country
    for (const [dcKey, recs] of byDeviceCountry) {
      const [keyDevice, keyCountry] = dcKey.split('#') as [string, string];
      if (keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `D#${keyDevice}`));
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // pk: "<date>#D#<device>#C#<country>" (device + country filter)
  // ─────────────────────────────────────────────────────────────────────────

  for (const [dcKey, dcRecs] of byDeviceCountry) {
    const [device, country] = dcKey.split('#') as [string, string];
    const pk = `${date}#D#${device}#C#${country}`;

    // SUMMARY for this device + country combo
    aggregates.push(createAggregate(dcRecs, pk, 'SUMMARY'));

    // Routes for this device + country combo
    for (const [dcrKey, recs] of byDeviceCountryRoute) {
      const [keyDevice, keyCountry, keyRoute] = dcrKey.split('#') as [
        string,
        string,
        string,
      ];
      if (keyDevice === device && keyCountry === country) {
        aggregates.push(createAggregate(recs, pk, `R#${keyRoute}`));
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
      `[web-vitals-aggregate] ${unprocessed.length} unprocessed items, retry ${attempt}/${MAX_RETRIES}`,
    );
  }

  if (unprocessed.length > 0) {
    console.error(
      `[web-vitals-aggregate] Failed to write ${unprocessed.length} items after ${MAX_RETRIES} retries`,
    );
    throw new Error(
      `Failed to write ${unprocessed.length} items after ${MAX_RETRIES} retries`,
    );
  }
};

/**
 * Write Web Vitals aggregates to MetricsWebVitals table.
 */
const writeAggregates = async (items: WebVitalAggregate[]): Promise<void> => {
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
      batchWriteWithRetry(Resource.MetricsWebVitals.name, batch),
    ),
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LAMBDA HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Web Vitals aggregation Lambda.
 * Runs daily to aggregate raw Web Vital metrics into pre-computed aggregates.
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
    console.log(`[web-vitals-aggregate] Using provided date: ${dateStr}`);
  } else {
    // Calculate the previous day's date
    const previousDay = new Date(now);
    previousDay.setDate(previousDay.getDate() - 1);
    dateStr = previousDay.toISOString().split('T')[0] as string;
  }

  // Time range for the full day
  // Note: sk format is "{timestamp}#{id}", so we use ~ suffix to capture all records
  // since ~ (ASCII 126) sorts after alphanumeric characters
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z~`;

  console.log(`[web-vitals-aggregate] Processing date ${dateStr}`);

  // Fetch raw Web Vital metrics
  const rawMetrics = await fetchRawMetrics(`WEB#${dateStr}`, dayStart, dayEnd);
  console.log(`[web-vitals-aggregate] Found ${rawMetrics.length} raw metrics`);

  if (rawMetrics.length === 0) {
    console.log('[web-vitals-aggregate] No metrics to aggregate');
    return;
  }

  // Aggregate
  const aggregates = aggregateWebVitals(rawMetrics, dateStr);
  console.log(`[web-vitals-aggregate] Created ${aggregates.length} aggregates`);

  // Write to table
  await writeAggregates(aggregates);

  console.log('[web-vitals-aggregate] Done');
};
