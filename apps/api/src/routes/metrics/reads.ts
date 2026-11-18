import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { queryAll } from '@/lib/db/query';

/**
 * The metrics reads' own client: reading the metrics is not recorded as a
 * dependency metric itself (the app's client is instrumented)
 */
export const metricsDynamo = new DynamoDBClient({});

/**
 * Generate date strings for a range of days ending yesterday.
 * We start from yesterday because the aggregation runs daily for the previous day,
 * so today's data doesn't exist yet.
 */
export const getDateRange = (
  days: number,
): { dates: string[]; endDate: string; startDate: string } => {
  const dates: string[] = [];
  const now = new Date();

  for (let i = 1; i <= days; i++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - i);
    dates.push(date.toISOString().split('T')[0] as string);
  }

  return {
    dates,
    endDate: dates[0] as string,
    startDate: dates[dates.length - 1] as string,
  };
};

/** Every item under a pk whose sort key starts with a prefix */
export const queryByPkAndPrefix = <T>(
  table: string,
  pk: string,
  skPrefix: string,
) =>
  queryAll<T>(
    {
      ExpressionAttributeNames: { '#pk': 'pk', '#sk': 'sk' },
      ExpressionAttributeValues: {
        ':pk': { S: pk },
        ':skPrefix': { S: skPrefix },
      },
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      TableName: table,
    },
    metricsDynamo,
  );

/**
 * One key's daily aggregates between two dates, on a time index whose keys
 * are `<gsi>PK` (the key) and `<gsi>SK` (the date)
 */
export const queryTimeSeries = <T>({
  endDate,
  gsi,
  index,
  pk,
  startDate,
  table,
}: Readonly<{
  table: string;
  index: string;
  gsi: 'GSI1' | 'GSI2' | 'GSI3';
  pk: string;
  startDate: string;
  endDate: string;
}>) =>
  queryAll<T>(
    {
      ExpressionAttributeNames: { '#pk': `${gsi}PK`, '#sk': `${gsi}SK` },
      ExpressionAttributeValues: {
        ':pk': { S: pk },
        ':skEnd': { S: endDate },
        ':skStart': { S: startDate },
      },
      IndexName: index,
      KeyConditionExpression: '#pk = :pk AND #sk BETWEEN :skStart AND :skEnd',
      TableName: table,
    },
    metricsDynamo,
  );
