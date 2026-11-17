/// <reference path="../../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from '../alerts';
import { backedUp } from './backup';
import { users } from './users';

export const follow = new sst.aws.Dynamo('Follow', {
  fields: {
    // As apps/api/src/lib/db/follow writes them. Never change these fields or
    // the indexes to "match" anything: that rebuilds a GSI or replaces the table.
    // GSI1: the followers of a user, by when they followed
    gsi1pk: 'string', // USER#{followingId}#FOLLOWERS
    gsi1sk: 'string', // {createdAt}#{followerId}

    // GSI2: the users someone follows, by when they followed them
    gsi2pk: 'string', // USER#{followerId}#FOLLOWING
    gsi2sk: 'string', // {createdAt}#{followingId}
    // Primary key: one item per follow, for direct follow/unfollow
    pk: 'string', // FOLLOW#{followerId}#{followingId}
    sk: 'string', // FOLLOW#{followerId}#{followingId} (same as pk)

    // Data fields
    // followerId: 'string',
    // followingId: 'string',
    // createdAt: 'number',
  },
  globalIndexes: {
    // Get all followers of a user, sorted by when they followed
    gsi1: {
      hashKey: 'gsi1pk',
      projection: 'all',
      rangeKey: 'gsi1sk',
    },
    // Get all users someone is following, sorted by when they followed them
    gsi2: {
      hashKey: 'gsi2pk',
      projection: 'all',
      rangeKey: 'gsi2sk',
    },
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  stream: 'new-and-old-images',
  transform: backedUp,
});

/**
 * Receives metadata (shard + sequence range) of stream batches that still fail
 * after all retries, so they can be inspected and replayed instead of being
 * dropped silently.
 */
const followSubscriberDlq = new sst.aws.Queue('FollowSubscriberDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max)
    },
  },
});
alarmOnDeadLetters('FollowSubscriberDLQ', followSubscriberDlq);

follow.subscribe(
  'FollowSubscriber',
  {
    handler: 'apps/api/src/lambdas/follow.handler',
    link: [followSubscriberDlq, users],
    memory: '256 MB',
    timeout: '10 seconds',
  },
  {
    transform: {
      eventSourceMapping: {
        batchSize: 10,
        // Deltas are aggregated per user, so a failure fails the whole batch:
        // split it in half on each retry, then send it to the DLQ.
        bisectBatchOnFunctionError: true,
        destinationConfig: {
          onFailure: {
            destinationArn: followSubscriberDlq.arn,
          },
        },
        maximumBatchingWindowInSeconds: 1,
        maximumRetryAttempts: 5,
      },
    },
  },
);
