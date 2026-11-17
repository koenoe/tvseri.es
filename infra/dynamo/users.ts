/// <reference path="../../.sst/platform/config.d.ts" />

export const users = new sst.aws.Dynamo('Users', {
  fields: {
    activePk: 'string', // ACTIVE (constant; only set once a user watched something)
    gsi1pk: 'string', // EMAIL#<email>
    gsi2pk: 'string', // USERNAME#<username>
    lastActiveAt: 'string', // ISO date of the last watch activity (max once a day)
    pk: 'string', // USER#<userId>

    // id: 'string',
    // username: 'string',
    // email: 'string',
    // name: 'string',
    // createdAt: 'string',
    // updatedAt?: 'string',
    // role: 'string', // 'user' | 'admin'
    // version: 'number',
    // lastRecheckAt?: 'string', // ISO date of the last on-visit watched-status re-check
  },
  globalIndexes: {
    // Sparse: users who watched something, by last activity. Read by the
    // nightly watched-status cron (validateWatchedStatusCron) to only queue
    // recently active users. Keys only: the cron just needs the user id (pk).
    active: {
      hashKey: 'activePk',
      projection: 'keys-only',
      rangeKey: 'lastActiveAt',
    },
    gsi1: { hashKey: 'gsi1pk', projection: 'all' }, // Email lookup
    gsi2: { hashKey: 'gsi2pk', projection: 'all' }, // Username lookup
  },
  primaryIndex: { hashKey: 'pk' },
});
