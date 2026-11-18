import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { USER_KEY_PREFIX } from '@tvseri.es/utils';
import { Resource } from 'sst';

import { ACTIVE_USER_WINDOW_MS } from '@/constants';
import { queryPages } from '@/lib/db/query';
import { ACTIVE_INDEX, ACTIVE_PK } from '@/lib/db/user';
import { queueWatchedStatusValidation } from '@/lib/watchedStatus';

/**
 * Queues every user who watched something within ACTIVE_USER_WINDOW_MS (the
 * sparse `active` index, kept up to date by lambdas/watched.ts). Users who
 * come back after that are re-checked on their first request instead
 * (middleware/auth.ts).
 */
export const handler = async () => {
  let queuedCount = 0;
  let failedCount = 0;
  const since = new Date(Date.now() - ACTIVE_USER_WINDOW_MS).toISOString();

  // A failed query still throws (EventBridge retries the run); users SQS
  // refused twice are only logged, as a rerun would queue everyone again
  for await (const page of queryPages({
    ExpressionAttributeValues: marshall({
      ':active': ACTIVE_PK,
      ':since': since,
    }),
    IndexName: ACTIVE_INDEX,
    KeyConditionExpression: 'activePk = :active AND lastActiveAt >= :since',
    Limit: 1000,
    TableName: Resource.Users.name,
  })) {
    // Keys-only index: pk is USER#<id>
    const userIds = (page.Items ?? []).map((item) =>
      (unmarshall(item) as Readonly<{ pk: string }>).pk.slice(
        USER_KEY_PREFIX.length,
      ),
    );

    const failed = await queueWatchedStatusValidation(userIds);
    failedCount += failed;
    queuedCount += userIds.length - failed;
  }

  if (failedCount > 0) {
    console.error(
      `[ERROR] ${failedCount} users failed to queue (${queuedCount} queued)`,
    );
    return { failedCount, queuedCount };
  }
  console.log(
    `[SUCCESS] ${queuedCount} active users queued to validate their watched items`,
  );
  return { failedCount, queuedCount };
};
