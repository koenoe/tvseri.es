/// <reference path="../.sst/platform/config.d.ts" />

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
    // tmdbAccountId: 'string',
    // tmdbAccountObjectId: 'string', // Store but don't index
    // version: 'number',
  },
  primaryIndex: { hashKey: 'pk' },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all' }, // Email lookup
    gsi2: { hashKey: 'gsi2pk', projection: 'all' }, // Username lookup
    gsi3: { hashKey: 'gsi3pk', projection: 'all' }, // TMDB account lookup
  },
});

export const sessions = new sst.aws.Dynamo('Sessions', {
  fields: {
    // Primary key for looking up single sessions
    pk: 'string', // SESSION#<sessionId>

    // Global Secondary Index for looking up all sessions by userId
    gsi1pk: 'string', // USER#<userId>

    // userId: 'string',
    // provider: 'string', // 'internal' | 'tmdb'
    // expiresAt: 'number', // TTL (unix timestamp in seconds)
    // createdAt: 'string',
    // clientIp: 'string',
    // userAgent: 'string',
    // version: 'number',

    // // TMDB specific fields - only populated for TMDB sessions
    // tmdbSessionId: 'string', // v3 API session
    // tmdbAccessToken: 'string', // v4 API token
  },
  primaryIndex: { hashKey: 'pk' },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all' },
  },
  ttl: 'expiresAt',
});
