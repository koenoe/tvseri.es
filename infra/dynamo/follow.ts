/// <reference path="../../.sst/platform/config.d.ts" />

export const follow = new sst.aws.Dynamo('Follow', {
  fields: {
    pk: 'string', // Partition Key: USER#<userId> (the user being followed)
    sk: 'string', // Sort Key: USER#<followerId> (the user doing the following)
    gsi1pk: 'string', // USER#<followerId> (the user doing the following)
    gsi1sk: 'string', // USER#<userId> (the user being followed)

    // followerId: 'string',
    // followingId: 'string',
    // createdAt: 'string',
  },
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk',
  },
  globalIndexes: {
    gsi1: {
      hashKey: 'gsi1pk',
      rangeKey: 'gsi1sk',
      projection: 'all',
    },
  },
});
