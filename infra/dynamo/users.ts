/// <reference path="../../.sst/platform/config.d.ts" />

export const users = new sst.aws.Dynamo('Users', {
  fields: {
    gsi1pk: 'string', // EMAIL#<email>
    gsi2pk: 'string', // USERNAME#<username>
    pk: 'string', // USER#<userId>

    // id: 'string',
    // username: 'string',
    // email: 'string',
    // name: 'string',
    // createdAt: 'string',
    // updatedAt?: 'string',
    // role: 'string', // 'user' | 'admin'
    // version: 'number',
  },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all' }, // Email lookup
    gsi2: { hashKey: 'gsi2pk', projection: 'all' }, // Username lookup
  },
  primaryIndex: { hashKey: 'pk' },
});
