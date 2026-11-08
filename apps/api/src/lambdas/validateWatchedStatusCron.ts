import {
  type AttributeValue,
  DynamoDBClient,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import { ACTIVE_USER_WINDOW_MS } from '@/constants';
import { ACTIVE_INDEX, ACTIVE_PK, USER_PK_PREFIX } from '@/lib/db/user';
import { queueWatchedStatusValidation } from '@/lib/watchedStatus';

const dynamo = new DynamoDBClient({});

/**
 * Queues every user who watched something within ACTIVE_USER_WINDOW_MS (the
 * sparse `active` index, kept up to date by lambdas/watched.ts). Users who
 * come back after that are re-checked on their first request instead
 * (middleware/auth.ts).
 */
export const handler = async () => {
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined;
  let queuedCount = 0;
  const since = new Date(Date.now() - ACTIVE_USER_WINDOW_MS).toISOString();

  try {
    do {
      const command = new QueryCommand({
        ExclusiveStartKey: lastEvaluatedKey,
        ExpressionAttributeValues: marshall({
          ':active': ACTIVE_PK,
          ':since': since,
        }),
        IndexName: ACTIVE_INDEX,
        KeyConditionExpression: 'activePk = :active AND lastActiveAt >= :since',
        Limit: 1000,
        TableName: Resource.Users.name,
      });

      const result = await dynamo.send(command);

      // Keys-only index: pk is USER#<id>
      const userIds = (result.Items ?? []).map((item) =>
        (unmarshall(item) as Readonly<{ pk: string }>).pk.slice(
          USER_PK_PREFIX.length,
        ),
      );

      const failedCount = await queueWatchedStatusValidation(userIds);
      if (failedCount > 0) {
        console.error(`[ERROR] ${failedCount} users failed to queue`);
      }
      queuedCount += userIds.length - failedCount;

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(
      `[SUCCESS] ${queuedCount} active users queued to validate their watched items`,
    );

    return {
      body: JSON.stringify({ queuedCount }),
      statusCode: 200,
    };
  } catch (error) {
    console.error(
      'Failed to queue users to validate their watched status:',
      error,
    );

    return {
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      statusCode: 500,
    };
  }
};
