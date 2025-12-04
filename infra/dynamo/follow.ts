/// <reference path="../../.sst/platform/config.d.ts" />

import { users } from './users';

export const follow = new sst.aws.Dynamo('Follow', {
  fields: {
    // GSI1: Query followers of a user (sorted by creation date)
    gsi1pk: 'string', // FOLLOW#{followerId}#{followingId}
    gsi1sk: 'string', // FOLLOW#{followerId}#{followingId} (same as pk for single-table design)

    // GSI2: Query users that someone is following (sorted by creation date)
    gsi2pk: 'string', // USER#{followingId}#FOLLOWERS
    gsi2sk: 'string', // {createdAt}#{followerId}
    // Primary key: enables direct follow/unfollow operations
    pk: 'string', // USER#{followerId}#FOLLOWING
    sk: 'string', // {createdAt}#{followingId}

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
});

follow.subscribe(
  'FollowSubscriber',
  {
    architecture: 'arm64',
    handler: 'apps/api/src/lambdas/follow.handler',
    link: [users],
    memory: '256 MB',
    nodejs: {
      esbuild: {
        external: ['@aws-sdk/client-dynamodb', '@aws-sdk/util-dynamodb'],
      },
    },
    runtime: 'nodejs22.x',
    timeout: '10 seconds',
  },
  {
    transform: {
      eventSourceMapping: {
        batchSize: 10,
        maximumBatchingWindowInSeconds: 1,
        maximumRetryAttempts: 5,
      },
    },
  },
);
