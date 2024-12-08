/// <reference path="../../.sst/platform/config.d.ts" />

export const cache = new sst.aws.Dynamo('Cache', {
  fields: {
    pk: 'string', // CACHE#<key>
    // value: 'string', // Stringified cached value
    // expiresAt: 'number', // Optional TTL (unix timestamp in seconds)
    // createdAt: 'string', // ISO timestamp
    // version: 'number', // Schema version
  },
  primaryIndex: { hashKey: 'pk' },
  ttl: 'expiresAt',
});
