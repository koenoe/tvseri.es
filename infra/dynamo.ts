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

export const lists = new sst.aws.Dynamo('Lists', {
  fields: {
    pk: 'string', // USER#<userId>
    sk: 'string', // LIST#CUSTOM#<listId> or LIST#WATCHLIST or LIST#FAVORITES or LIST#<listId>#ITEM#<tmdbId>
    gsi1pk: 'string', // LIST#<userId>#<listId>
    gsi1sk: 'string', // title (lowercase)
    gsi2pk: 'string', // LIST#<userId>#<listId>
    gsi2sk: 'number', // created_at
    gsi3pk: 'string', // LIST#<userId>#<listId> (only for custom lists)
    gsi3sk: 'number', // position (only for custom lists)

    // listId: 'string',
    // id: 'number',
    // title: 'string',
    // slug: 'string',
    // description: 'string',
    // createdAt: 'number',
    // position: 'number', // Optional, only for custom lists
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk', projection: 'all' },
    gsi2: { hashKey: 'gsi2pk', rangeKey: 'gsi2sk', projection: 'all' },
    gsi3: { hashKey: 'gsi3pk', rangeKey: 'gsi3sk', projection: 'all' },
  },
});

export const preferredImages = new sst.aws.Dynamo('PreferredImages', {
  fields: {
    pk: 'string', // SERIES#<seriesId>

    // backdropImagePath: 'string',
    // titleTreatmentImagePath: 'string',
    // updatedAt: 'number',
  },
  primaryIndex: { hashKey: 'pk' },
});
