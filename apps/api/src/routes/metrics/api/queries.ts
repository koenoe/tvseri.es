import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { ApiMetricAggregate, PercentileStats } from '@tvseri.es/schemas';
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
 * Query endpoint time-series using GSI3 (EndpointTimeIndex).
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
          '#gsi3pk': 'GSI3PK',
          '#gsi3sk': 'GSI3SK',
        },
        ExpressionAttributeValues: {
          ':gsi3pk': { S: `E#${endpoint}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'EndpointTimeIndex',
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
 * Query platform time-series using GSI4 (PlatformTimeIndex).
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
          '#gsi4pk': 'GSI4PK',
          '#gsi4sk': 'GSI4SK',
        },
        ExpressionAttributeValues: {
          ':gsi4pk': { S: `P#${platform}` },
          ':skEnd': { S: endDate },
          ':skStart': { S: startDate },
        },
        IndexName: 'PlatformTimeIndex',
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
 * Aggregate multiple daily summaries into a single summary.
 */
export const aggregateSummaries = (
  items: ApiMetricAggregate[],
): {
  errorRate: number;
  latency: PercentileStats;
  requestCount: number;
  statusCodes: ApiMetricAggregate['statusCodes'];
} | null => {
  if (items.length === 0) return null;

  const totalRequests = items.reduce((sum, item) => sum + item.requestCount, 0);
  if (totalRequests === 0) return null;

  // Weighted average for latency percentiles
  const weightedP75 =
    items.reduce((sum, item) => sum + item.latency.p75 * item.requestCount, 0) /
    totalRequests;
  const weightedP90 =
    items.reduce((sum, item) => sum + item.latency.p90 * item.requestCount, 0) /
    totalRequests;
  const weightedP95 =
    items.reduce((sum, item) => sum + item.latency.p95 * item.requestCount, 0) /
    totalRequests;
  const weightedP99 =
    items.reduce((sum, item) => sum + item.latency.p99 * item.requestCount, 0) /
    totalRequests;

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

  return {
    errorRate,
    latency: {
      count: totalRequests,
      p75: Math.round(weightedP75),
      p90: Math.round(weightedP90),
      p95: Math.round(weightedP95),
      p99: Math.round(weightedP99),
    },
    requestCount: totalRequests,
    statusCodes,
  };
};
