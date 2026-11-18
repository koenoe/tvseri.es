import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import { queryAll } from '@/lib/db/query';

/**
 * Raw metrics are written across this many shards (`<pk>#<shard>`), so a
 * busy day has no hot partition; the aggregation reads them all
 */
export const RAW_SHARD_COUNT = 10;

/** A random shard for a raw metric write */
export const randomRawShard = (): number =>
  Math.floor(Math.random() * RAW_SHARD_COUNT);

/**
 * Every raw metric of a day under `basePk`: one Query per shard, all shards
 * in parallel
 */
export const fetchRawMetrics = async <T>(
  dynamo: DynamoDBClient,
  basePk: string,
  dayStart: string,
  dayEnd: string,
): Promise<T[]> => {
  const shards = await Promise.all(
    Array.from({ length: RAW_SHARD_COUNT }, (_, shard) =>
      queryAll<T>(
        {
          ExpressionAttributeNames: { '#pk': 'pk', '#sk': 'sk' },
          ExpressionAttributeValues: marshall({
            ':dayEnd': dayEnd,
            ':dayStart': dayStart,
            ':pk': `${basePk}#${shard}`,
          }),
          KeyConditionExpression:
            '#pk = :pk AND #sk BETWEEN :dayStart AND :dayEnd',
          TableName: Resource.MetricsRaw.name,
        },
        dynamo,
      ),
    ),
  );
  return shards.flat();
};
