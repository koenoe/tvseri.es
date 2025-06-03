/// <reference path="../../.sst/platform/config.d.ts" />

export const follow = new sst.aws.Dynamo('Follow', {
  fields: {
    // Primary key: enables direct follow/unfollow operations
    pk: 'string', // FOLLOW#{followerId}#{followingId}
    sk: 'string', // FOLLOW#{followerId}#{followingId} (same as pk for single-table design)

    // GSI1: Query followers of a user (sorted by creation date)
    gsi1pk: 'string', // USER#{followingId}#FOLLOWERS
    gsi1sk: 'string', // {createdAt}#{followerId}

    // GSI2: Query users that someone is following (sorted by creation date)
    gsi2pk: 'string', // USER#{followerId}#FOLLOWING
    gsi2sk: 'string', // {createdAt}#{followingId}

    // Data fields
    // followerId: 'string',
    // followingId: 'string',
    // createdAt: 'number',
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  globalIndexes: {
    // Get all followers of a user, sorted by when they followed
    gsi1: {
      hashKey: 'gsi1pk',
      rangeKey: 'gsi1sk',
      projection: 'all',
    },
    // Get all users someone is following, sorted by when they followed them
    gsi2: {
      hashKey: 'gsi2pk',
      rangeKey: 'gsi2sk',
      projection: 'all',
    },
  },
});
