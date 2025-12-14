import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { WebVitalAggregate } from '@tvseri.es/schemas';
import {
  computeRESFromStats,
  mergeHistograms,
  percentileFromHistogram,
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
 *   buildPk("2025-12-11", { device: "mobile" })     → "2025-12-11#D#mobile"
 *   buildPk("2025-12-11", { country: "US" })        → "2025-12-11#C#US"
 *   buildPk("2025-12-11", { device: "mobile", country: "US" }) → "2025-12-11#D#mobile#C#US"
 */
export const buildPk = (
  date: string,
  filters?: { country?: string; device?: string },
): string => {
  let pk = date;
  if (filters?.device) {
    pk += `#D#${filters.device}`;
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
 *
 * @param pk - The partition key (date with optional filters)
 * @param skPrefix - The sort key prefix (SUMMARY, R#, C#, D#)
 */
export const queryByPkAndPrefix = async (
  pk: string,
  skPrefix: string,
): Promise<WebVitalAggregate[]> => {
  const items: WebVitalAggregate[] = [];
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
        TableName: Resource.MetricsWebVitals.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as WebVitalAggregate),
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
): Promise<WebVitalAggregate | null> => {
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
      TableName: Resource.MetricsWebVitals.name,
    }),
  );

  if (result.Items && result.Items.length > 0) {
    return unmarshall(
      result.Items[0] as Record<string, AttributeValue>,
    ) as WebVitalAggregate;
  }

  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// GSI TIME-SERIES QUERIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Query route time-series using GSI1 (RouteTimeIndex).
 * Returns daily aggregates for a specific route over a date range.
 */
export const queryRouteTimeSeries = async (
  route: string,
  startDate: string,
  endDate: string,
): Promise<WebVitalAggregate[]> => {
  const items: WebVitalAggregate[] = [];
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
          ':gsi1pk': { S: `R#${route}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'RouteTimeIndex',
        KeyConditionExpression:
          '#gsi1pk = :gsi1pk AND #gsi1sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsWebVitals.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as WebVitalAggregate),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Query country time-series using GSI2 (CountryTimeIndex).
 * Returns daily aggregates for a specific country over a date range.
 */
export const queryCountryTimeSeries = async (
  country: string,
  startDate: string,
  endDate: string,
): Promise<WebVitalAggregate[]> => {
  const items: WebVitalAggregate[] = [];
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
          ':gsi2pk': { S: `C#${country}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'CountryTimeIndex',
        KeyConditionExpression:
          '#gsi2pk = :gsi2pk AND #gsi2sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsWebVitals.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as WebVitalAggregate),
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
};

/**
 * Query device time-series using GSI3 (DeviceTimeIndex).
 * Returns daily aggregates for a specific device type over a date range.
 */
export const queryDeviceTimeSeries = async (
  device: string,
  startDate: string,
  endDate: string,
): Promise<WebVitalAggregate[]> => {
  const items: WebVitalAggregate[] = [];
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
          ':gsi3pk': { S: `D#${device}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'DeviceTimeIndex',
        KeyConditionExpression:
          '#gsi3pk = :gsi3pk AND #gsi3sk BETWEEN :skStart AND :skEnd',
        TableName: Resource.MetricsWebVitals.name,
      }),
    );

    if (result.Items) {
      items.push(
        ...result.Items.map((item) => unmarshall(item) as WebVitalAggregate),
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
 * Aggregate multiple daily summaries into a single summary.
 * Merges histograms to compute accurate percentiles.
 * Falls back to weighted averages for data without histograms.
 *
 * RES is recalculated from the merged p75 values using Vercel's methodology
 * (log-normal scoring with LCP 30%, INP 30%, CLS 25%, FCP 15%).
 */
export const aggregateSummaries = (
  items: WebVitalAggregate[],
): {
  CLS: WebVitalAggregate['CLS'];
  FCP: WebVitalAggregate['FCP'];
  INP: WebVitalAggregate['INP'];
  LCP: WebVitalAggregate['LCP'];
  pageviews: number;
  score: number;
  TTFB: WebVitalAggregate['TTFB'];
} | null => {
  if (items.length === 0) return null;

  const totalPageviews = items.reduce((sum, item) => sum + item.pageviews, 0);

  const aggregateMetric = (
    metricName: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB',
  ): WebVitalAggregate['CLS'] => {
    const totalCount = items.reduce(
      (sum, item) => sum + item[metricName].count,
      0,
    );

    if (totalCount === 0) {
      return {
        count: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        ratings: { good: 0, needsImprovement: 0, poor: 0 },
      };
    }

    // Sum ratings (always accurate)
    const ratings = {
      good: items.reduce((sum, item) => sum + item[metricName].ratings.good, 0),
      needsImprovement: items.reduce(
        (sum, item) => sum + item[metricName].ratings.needsImprovement,
        0,
      ),
      poor: items.reduce((sum, item) => sum + item[metricName].ratings.poor, 0),
    };

    // Collect histograms from items that have them
    const histograms = items
      .map((item) => item[metricName].histogram?.bins)
      .filter(
        (bins): bins is number[] => bins !== undefined && bins.length > 0,
      );

    // Only use histograms if ALL items have them (avoid mixing histogram-based
    // percentiles with a count that includes non-histogram items)
    if (histograms.length === items.length && histograms.length > 0) {
      const mergedBins = mergeHistograms(histograms);

      return {
        count: totalCount,
        p75: percentileFromHistogram(mergedBins, metricName, 75),
        p90: percentileFromHistogram(mergedBins, metricName, 90),
        p95: percentileFromHistogram(mergedBins, metricName, 95),
        p99: percentileFromHistogram(mergedBins, metricName, 99),
        ratings,
      };
    }

    // Fallback: weighted averages for legacy data without histograms
    const weightedP75 =
      items.reduce(
        (sum, item) => sum + item[metricName].p75 * item[metricName].count,
        0,
      ) / totalCount;
    const weightedP90 =
      items.reduce(
        (sum, item) => sum + item[metricName].p90 * item[metricName].count,
        0,
      ) / totalCount;
    const weightedP95 =
      items.reduce(
        (sum, item) => sum + item[metricName].p95 * item[metricName].count,
        0,
      ) / totalCount;
    const weightedP99 =
      items.reduce(
        (sum, item) => sum + item[metricName].p99 * item[metricName].count,
        0,
      ) / totalCount;

    return {
      count: totalCount,
      p75: weightedP75,
      p90: weightedP90,
      p95: weightedP95,
      p99: weightedP99,
      ratings,
    };
  };

  // Aggregate each metric
  const CLS = aggregateMetric('CLS');
  const FCP = aggregateMetric('FCP');
  const INP = aggregateMetric('INP');
  const LCP = aggregateMetric('LCP');
  const TTFB = aggregateMetric('TTFB');

  // Recalculate RES from the merged p75 values using Vercel's methodology:
  // - Uses Lighthouse 10 log-normal scoring curves
  // - Weighted: LCP 30%, INP 30%, CLS 25%, FCP 15%
  // - TTFB is intentionally excluded from RES
  const score = computeRESFromStats({ CLS, FCP, INP, LCP });

  return {
    CLS,
    FCP,
    INP,
    LCP,
    pageviews: totalPageviews,
    score,
    TTFB,
  };
};
