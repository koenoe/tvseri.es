import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  Apdex,
  ApiMetricAggregate,
  ApiTopCountry,
  ApiTopEndpoint,
  ApiTopPath,
  DependencyStats,
  LatencyRatings,
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
 *   buildPk("2025-12-11")                                      → "2025-12-11"
 *   buildPk("2025-12-11", { platform: "ios" })                 → "2025-12-11#P#ios"
 *   buildPk("2025-12-11", { country: "US" })                   → "2025-12-11#C#US"
 *   buildPk("2025-12-11", { platform: "ios", country: "US" })  → "2025-12-11#P#ios#C#US"
 */
export const buildPk = (
  date: string,
  filters?: { country?: string; platform?: string },
): string => {
  let pk = date;
  if (filters?.platform) {
    pk += `#P#${filters.platform}`;
  }
  if (filters?.country) {
    pk += `#C#${filters.country}`;
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
        TableName: Resource.MetricsApiAggregated.name,
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
      TableName: Resource.MetricsApiAggregated.name,
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
        TableName: Resource.MetricsApiAggregated.name,
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
 * Query platform time-series using GSI2 (PlatformTimeIndex).
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
          '#gsi2pk': 'GSI2PK',
          '#gsi2sk': 'GSI2SK',
        },
        ExpressionAttributeValues: {
          ':gsi2pk': { S: `P#${platform}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'PlatformTimeIndex',
        KeyConditionExpression:
          '#gsi2pk = :gsi2pk AND #gsi2sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsApiAggregated.name,
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
 * Query country time-series using GSI3 (CountryTimeIndex).
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
          '#gsi3pk': 'GSI3PK',
          '#gsi3sk': 'GSI3SK',
        },
        ExpressionAttributeValues: {
          ':gsi3pk': { S: `C#${country}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'CountryTimeIndex',
        KeyConditionExpression:
          '#gsi3pk = :gsi3pk AND #gsi3sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsApiAggregated.name,
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

  // Aggregate latency ratings if present
  let ratings: LatencyRatings | undefined;
  const itemsWithRatings = items.filter((item) => item.latency.ratings);
  if (itemsWithRatings.length > 0) {
    ratings = { fast: 0, moderate: 0, slow: 0 };
    for (const item of itemsWithRatings) {
      if (item.latency.ratings) {
        ratings.fast += item.latency.ratings.fast;
        ratings.moderate += item.latency.ratings.moderate;
        ratings.slow += item.latency.ratings.slow;
      }
    }
  }

  const latency: PercentileStats = {
    count: totalRequests,
    p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
    p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
    p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
    p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
    ratings,
  };

  // Sum status codes by category and individual codes
  const statusCodes: {
    clientError: number;
    codes: Record<string, number>;
    redirect: number;
    serverError: number;
    success: number;
  } = {
    clientError: 0,
    codes: {},
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
      // Merge individual codes
      if (item.statusCodes.codes) {
        for (const [code, count] of Object.entries(item.statusCodes.codes)) {
          statusCodes.codes[code] = (statusCodes.codes[code] ?? 0) + count;
        }
      }
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

/**
 * Aggregate topPaths from multiple daily endpoint records.
 * Merges histograms for accurate percentile calculation across days.
 *
 * @param items - Daily endpoint aggregates containing topPaths
 * @param limit - Maximum number of paths to return (default 25)
 * @returns Aggregated top paths sorted by request count
 */
export const aggregateTopPaths = (
  items: ApiMetricAggregate[],
  limit = 25,
): ApiTopPath[] => {
  // Collect all topPaths from all days
  const allPaths = items.flatMap((item) => item.topPaths ?? []);
  if (allPaths.length === 0) return [];

  // Group by path
  const byPath = new Map<
    string,
    {
      codes: Record<string, number>;
      errorCount: number;
      histograms: number[][];
      requestCount: number;
    }
  >();

  for (const pathItem of allPaths) {
    const existing = byPath.get(pathItem.path);
    if (existing) {
      existing.requestCount += pathItem.requestCount;
      existing.errorCount += pathItem.errorCount;
      if (pathItem.histogram?.bins?.length > 0) {
        existing.histograms.push(pathItem.histogram.bins);
      }
      // Merge status codes
      for (const [code, count] of Object.entries(pathItem.codes ?? {})) {
        existing.codes[code] = (existing.codes[code] ?? 0) + count;
      }
    } else {
      byPath.set(pathItem.path, {
        codes: { ...(pathItem.codes ?? {}) },
        errorCount: pathItem.errorCount,
        histograms:
          pathItem.histogram?.bins?.length > 0 ? [pathItem.histogram.bins] : [],
        requestCount: pathItem.requestCount,
      });
    }
  }

  // Build aggregated paths
  const aggregatedPaths: ApiTopPath[] = [];

  for (const [
    path,
    { codes, errorCount, histograms, requestCount },
  ] of byPath) {
    if (histograms.length === 0) continue;

    const mergedBins = mergeHistogramBins(histograms);
    const errorRate =
      requestCount > 0
        ? Math.round((errorCount / requestCount) * 10000) / 100
        : 0;

    aggregatedPaths.push({
      codes,
      errorCount,
      errorRate,
      histogram: { bins: mergedBins },
      p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
      p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
      p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
      p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
      path,
      requestCount,
    });
  }

  // Sort by request count and limit
  return aggregatedPaths
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, limit);
};

/**
 * Aggregate topEndpoints from multiple days into a single list.
 * Merges histograms for accurate percentile calculation.
 */
export const aggregateTopEndpoints = (
  items: ApiMetricAggregate[],
  limit = 25,
): ApiTopEndpoint[] => {
  // Collect all topEndpoints from all days
  const allEndpoints = items.flatMap((item) => item.topEndpoints ?? []);
  if (allEndpoints.length === 0) return [];

  // Group by endpoint
  const byEndpoint = new Map<
    string,
    {
      dependencyNames: Set<string>;
      errorCount: number;
      histograms: number[][];
      requestCount: number;
      satisfiedCount: number;
      toleratingCount: number;
    }
  >();

  for (const endpointItem of allEndpoints) {
    const existing = byEndpoint.get(endpointItem.endpoint);
    // Calculate satisfied/tolerating counts from apdex score for re-aggregation
    // apdex = (satisfied + tolerating * 0.5) / total
    // We approximate by assuming the ratio is preserved
    const satisfied = Math.round(
      endpointItem.apdexScore * endpointItem.requestCount,
    );
    const tolerating = 0; // Approximation - we can't perfectly reconstruct

    if (existing) {
      existing.requestCount += endpointItem.requestCount;
      existing.errorCount += endpointItem.errorCount;
      existing.satisfiedCount += satisfied;
      existing.toleratingCount += tolerating;
      if (endpointItem.histogram?.bins?.length > 0) {
        existing.histograms.push(endpointItem.histogram.bins);
      }
      for (const dep of endpointItem.dependencyNames) {
        existing.dependencyNames.add(dep);
      }
    } else {
      byEndpoint.set(endpointItem.endpoint, {
        dependencyNames: new Set(endpointItem.dependencyNames),
        errorCount: endpointItem.errorCount,
        histograms:
          endpointItem.histogram?.bins?.length > 0
            ? [endpointItem.histogram.bins]
            : [],
        requestCount: endpointItem.requestCount,
        satisfiedCount: satisfied,
        toleratingCount: tolerating,
      });
    }
  }

  // Build aggregated endpoints
  const aggregatedEndpoints: ApiTopEndpoint[] = [];

  for (const [
    endpoint,
    {
      dependencyNames,
      errorCount,
      histograms,
      requestCount,
      satisfiedCount,
      toleratingCount,
    },
  ] of byEndpoint) {
    if (histograms.length === 0) continue;

    const mergedBins = mergeHistogramBins(histograms);
    const errorRate =
      requestCount > 0
        ? Math.round((errorCount / requestCount) * 10000) / 100
        : 0;
    // Recalculate apdex from aggregated counts
    const apdexScore =
      requestCount > 0
        ? Math.round(
            ((satisfiedCount + toleratingCount * 0.5) / requestCount) * 100,
          ) / 100
        : 0;

    aggregatedEndpoints.push({
      apdexScore,
      dependencyNames: [...dependencyNames].sort(),
      endpoint,
      errorCount,
      errorRate,
      histogram: { bins: mergedBins },
      p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
      p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
      p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
      p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
      requestCount,
    });
  }

  // Sort by request count and limit
  return aggregatedEndpoints
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, limit);
};

/**
 * Aggregate topCountries from multiple days into a single list.
 * Merges histograms for accurate percentile calculation.
 */
export const aggregateTopCountries = (
  items: ApiMetricAggregate[],
  limit = 25,
): ApiTopCountry[] => {
  // Collect all topCountries from all days
  const allCountries = items.flatMap((item) => item.topCountries ?? []);
  if (allCountries.length === 0) return [];

  // Group by country
  const byCountry = new Map<
    string,
    {
      errorCount: number;
      histograms: number[][];
      requestCount: number;
    }
  >();

  for (const countryItem of allCountries) {
    const existing = byCountry.get(countryItem.country);
    if (existing) {
      existing.requestCount += countryItem.requestCount;
      existing.errorCount += countryItem.errorCount;
      if (countryItem.histogram?.bins?.length > 0) {
        existing.histograms.push(countryItem.histogram.bins);
      }
    } else {
      byCountry.set(countryItem.country, {
        errorCount: countryItem.errorCount,
        histograms:
          countryItem.histogram?.bins?.length > 0
            ? [countryItem.histogram.bins]
            : [],
        requestCount: countryItem.requestCount,
      });
    }
  }

  // Build aggregated countries
  const aggregatedCountries: ApiTopCountry[] = [];

  for (const [country, { errorCount, histograms, requestCount }] of byCountry) {
    if (histograms.length === 0) continue;

    const mergedBins = mergeHistogramBins(histograms);
    const errorRate =
      requestCount > 0
        ? Math.round((errorCount / requestCount) * 10000) / 100
        : 0;

    aggregatedCountries.push({
      country,
      errorCount,
      errorRate,
      histogram: { bins: mergedBins },
      p75: Math.round(percentileFromLatencyHistogram(mergedBins, 75)),
      p90: Math.round(percentileFromLatencyHistogram(mergedBins, 90)),
      p95: Math.round(percentileFromLatencyHistogram(mergedBins, 95)),
      p99: Math.round(percentileFromLatencyHistogram(mergedBins, 99)),
      requestCount,
    });
  }

  // Sort by request count and limit
  return aggregatedCountries
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, limit);
};
