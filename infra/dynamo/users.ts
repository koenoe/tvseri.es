/// <reference path="../../.sst/platform/config.d.ts" />

export const users = new sst.aws.Dynamo('Users', {
  fields: {
    pk: 'string', // USER#<userId>
    gsi1pk: 'string', // EMAIL#<email>
    gsi2pk: 'string', // USERNAME#<username>
    gsi3pk: 'string', // TMDB#<accountId>

    // id: 'string',
    // username: 'string',
    // email: 'string',
    // name: 'string',
    // createdAt: 'string',
    // role: 'string', // 'user' | 'admin'
    // tmdbAccountId: 'number',
    // tmdbAccountObjectId: 'string',
    // tmdbUsername: 'string',
    // version: 'number',
  },
  primaryIndex: { hashKey: 'pk' },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all' }, // Email lookup
    gsi2: { hashKey: 'gsi2pk', projection: 'all' }, // Username lookup
    gsi3: { hashKey: 'gsi3pk', projection: 'all' }, // TMDB account lookup
  },
});
