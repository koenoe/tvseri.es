import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  Apdex,
  ApiMetricAggregate,
  DependencyStats,
  PercentileStats,
} from '@tvseri.es/schemas';
import {
  mergeHistogramBins,
  percentileFromLatencyHistogram,
} from '@tvseri.es/utils';
import { Resource } from 'sst';

const dynamoClient = new DynamoDBClient({});

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate date strings for a range of days ending today.
 */
export const getDateRange = (
  days: number,
): { dates: string[]; endDate: string; startDate: string } => {
  const dates: string[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0] as string);
  }

  return {
    dates,
    endDate: dates[0] as string,
    startDate: dates[dates.length - 1] as string,
  };
};

/**
 * Build the pk for a given date and optional filters.
 *
 * Examples:
 *   buildPk("2025-12-11")                           → "2025-12-11"
 *   buildPk("2025-12-11", { platform: "ios" })      → "2025-12-11#P#ios"
 */
export const buildPk = (
  date: string,
  filters?: { platform?: string },
): string => {
  let pk = date;
  if (filters?.platform) {
    pk += `#P#${filters.platform}`;
  }
  return pk;
};

// ════════════════════════════════════════════════════════════════════════════
// PRIMARY INDEX QUERIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Query by pk and sk prefix.
 */
export const queryByPkAndPrefix = async (
  pk: string,
  skPrefix: string,
): Promise<ApiMetricAggregate[]> => {
  const items: ApiMetricAggregate[] = [];
  let lastKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new QueryCommand({
        ExclusiveStartKey: lastKey,
        ExpressionAttributeNames: {
          '#pk': 'pk',
          '#sk': 'sk',
        },
        ExpressionAttributeValues: {
          ':pk': { S: pk },
          ':skPrefix': { S: skPrefix },
        },
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
        TableName: Resource.MetricsApi.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as ApiMetricAggregate),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Query a single item by exact pk and sk.
 */
export const queryExact = async (
  pk: string,
  sk: string,
): Promise<ApiMetricAggregate | null> => {
  const result = await dynamoClient.send(
    new QueryCommand({
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': { S: pk },
        ':sk': { S: sk },
      },
      KeyConditionExpression: '#pk = :pk AND #sk = :sk',
      Limit: 1,
      TableName: Resource.MetricsApi.name,
    }),
  );

  if (result.Items && result.Items.length > 0) {
    return unmarshall(
      result.Items[0] as Record<string, AttributeValue>,
    ) as ApiMetricAggregate;
  }

  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// GSI TIME-SERIES QUERIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Query endpoint time-series using GSI1 (EndpointTimeIndex).
 */
export const queryEndpointTimeSeries = async (
  endpoint: string,
  startDate: string,
  endDate: string,
): Promise<ApiMetricAggregate[]> => {
  const items: ApiMetricAggregate[] = [];
  let lastKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new QueryCommand({
        ExclusiveStartKey: lastKey,
        ExpressionAttributeNames: {
          '#gsi1pk': 'GSI1PK',
          '#gsi1sk': 'GSI1SK',
        },
        ExpressionAttributeValues: {
          ':gsi1pk': { S: `E#${endpoint}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'EndpointTimeIndex',
        KeyConditionExpression:
          '#gsi1pk = :gsi1pk AND #gsi1sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsApi.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as ApiMetricAggregate),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Query status category time-series using GSI2 (StatusTimeIndex).
 */
export const queryStatusTimeSeries = async (
  statusCategory: string,
  startDate: string,
  endDate: string,
): Promise<ApiMetricAggregate[]> => {
  const items: ApiMetricAggregate[] = [];
  let lastKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new QueryCommand({
        ExclusiveStartKey: lastKey,
        ExpressionAttributeNames: {
          '#gsi2pk': 'GSI2PK',
          '#gsi2sk': 'GSI2SK',
        },
        ExpressionAttributeValues: {
          ':gsi2pk': { S: `S#${statusCategory}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'StatusTimeIndex',
        KeyConditionExpression:
          '#gsi2pk = :gsi2pk AND #gsi2sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsApi.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as ApiMetricAggregate),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Query platform time-series using GSI3 (PlatformTimeIndex).
 */
export const queryPlatformTimeSeries = async (
  platform: string,
  startDate: string,
  endDate: string,
): Promise<ApiMetricAggregate[]> => {
  const items: ApiMetricAggregate[] = [];
  let lastKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new QueryCommand({
        ExclusiveStartKey: lastKey,
        ExpressionAttributeNames: {
          '#gsi3pk': 'GSI3PK',
          '#gsi3sk': 'GSI3SK',
        },
        ExpressionAttributeValues: {
          ':gsi3pk': { S: `P#${platform}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'PlatformTimeIndex',
        KeyConditionExpression:
          '#gsi3pk = :gsi3pk AND #gsi3sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsApi.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as ApiMetricAggregate),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Query country time-series using GSI4 (CountryTimeIndex).
 */
export const queryCountryTimeSeries = async (
  country: string,
  startDate: string,
  endDate: string,
): Promise<ApiMetricAggregate[]> => {
  const items: ApiMetricAggregate[] = [];
  let lastKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamoClient.send(
      new QueryCommand({
        ExclusiveStartKey: lastKey,
        ExpressionAttributeNames: {
          '#gsi4pk': 'GSI4PK',
          '#gsi4sk': 'GSI4SK',
        },
        ExpressionAttributeValues: {
          ':gsi4pk': { S: `C#${country}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'CountryTimeIndex',
        KeyConditionExpression:
          '#gsi4pk = :gsi4pk AND #gsi4sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsApi.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as ApiMetricAggregate),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

// ════════════════════════════════════════════════════════════════════════════
// AGGREGATION UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Aggregated API metrics summary.
 */
export type AggregatedApiMetrics = {
  apdex: Apdex;
  dependencies?: Record<string, DependencyStats>;
  errorRate: number;
  latency: PercentileStats;
  requestCount: number;
  statusCodes: ApiMetricAggregate['statusCodes'];
  /** Throughput: requests per minute (rpm) */
  throughput: number;
};

/**
 * Aggregate multiple daily summaries into a single summary.
 * Uses histogram merging for accurate percentile calculation when histograms
 * are available, falling back to weighted averages for legacy data.
 */
export const aggregateSummaries = (
  items: ApiMetricAggregate[],
): AggregatedApiMetrics | null => {
  if (items.length === 0) return null;

  const totalRequests = items.reduce((sum, item) => sum + item.requestCount, 0);
  if (totalRequests === 0) return null;

  // Collect histograms from items and merge for accurate percentiles
  const histograms = items
    .map((item) => item.latency.histogram?.bins)
    .filter((bins): bins is number[] => bins !== undefined && bins.length > 0);

  if (histograms.length === 0) return null;

  const mergedBins = mergeHistogramBins(histograms);
  const latency: PercentileStats = {
    count: totalRequests,
    p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
    p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
    p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
    p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
  };

  // Sum status codes by category
  const statusCodes = {
    clientError: 0,
    redirect: 0,
    serverError: 0,
    success: 0,
  };
  for (const item of items) {
    if (item.statusCodes) {
      statusCodes.success += item.statusCodes.success ?? 0;
      statusCodes.redirect += item.statusCodes.redirect ?? 0;
      statusCodes.clientError += item.statusCodes.clientError ?? 0;
      statusCodes.serverError += item.statusCodes.serverError ?? 0;
    }
  }

  // Calculate error rate from status codes
  const totalErrors = statusCodes.clientError + statusCodes.serverError;
  const errorRate = Math.round((totalErrors / totalRequests) * 10000) / 100;

  // Aggregate Apdex: sum counts across days, recalculate score
  const apdex: Apdex = {
    frustrated: 0,
    satisfied: 0,
    score: 1,
    tolerating: 0,
  };
  for (const item of items) {
    if (item.apdex) {
      apdex.satisfied += item.apdex.satisfied;
      apdex.tolerating += item.apdex.tolerating;
      apdex.frustrated += item.apdex.frustrated;
    }
  }
  const apdexTotal = apdex.satisfied + apdex.tolerating + apdex.frustrated;
  if (apdexTotal > 0) {
    apdex.score =
      Math.round(
        ((apdex.satisfied + apdex.tolerating * 0.5) / apdexTotal) * 100,
      ) / 100;
  }

  // Aggregate dependencies if present
  let dependencies: Record<string, DependencyStats> | undefined;
  const depsWithData = items.filter((item) => item.dependencies);
  if (depsWithData.length > 0) {
    const depData = new Map<
      string,
      { errorCount: number; histograms: number[][] }
    >();

    for (const item of depsWithData) {
      if (!item.dependencies) continue;
      for (const [source, stats] of Object.entries(item.dependencies)) {
        const existing = depData.get(source);
        if (existing) {
          if (stats.histogram?.bins) {
            existing.histograms.push(stats.histogram.bins);
          }
          existing.errorCount += stats.errorCount ?? 0;
        } else {
          depData.set(source, {
            errorCount: stats.errorCount ?? 0,
            histograms: stats.histogram?.bins ? [stats.histogram.bins] : [],
          });
        }
      }
    }

    if (depData.size > 0) {
      // Count unique dates for throughput calculation
      const depDaysWithData = new Set(depsWithData.map((item) => item.date))
        .size;
      const depMinutesInPeriod = depDaysWithData * 1440;

      dependencies = {};
      for (const [source, { errorCount, histograms }] of depData) {
        if (histograms.length === 0) continue;
        const mergedBins = mergeHistogramBins(histograms);
        const totalCount = histograms.reduce(
          (sum, bins) => sum + bins.reduce((a, b) => a + b, 0),
          0,
        );
        const throughput =
          depMinutesInPeriod > 0
            ? Math.round((totalCount / depMinutesInPeriod) * 100) / 100
            : 0;
        dependencies[source] = {
          count: totalCount,
          errorCount,
          errorRate:
            totalCount > 0
              ? Math.round((errorCount / totalCount) * 10000) / 100
              : 0,
          p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
          p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
          p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
          p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
          throughput,
        };
      }
    }
  }

  // Calculate throughput (requests per minute)
  // Count unique dates to get the actual number of days with data
  const uniqueDates = new Set(items.map((item) => item.date));
  const daysWithData = uniqueDates.size;
  const minutesInPeriod = daysWithData * 1440; // 1440 minutes per day
  const throughput =
    minutesInPeriod > 0
      ? Math.round((totalRequests / minutesInPeriod) * 100) / 100
      : 0;

  return {
    apdex,
    dependencies,
    errorRate,
    latency,
    requestCount: totalRequests,
    statusCodes,
    throughput,
  };
};
