/// <reference path="../../.sst/platform/config.d.ts" />

export const webhookTokens = new sst.aws.Dynamo('WebhookTokens', {
  fields: {
    pk: 'string', // TOKEN#<token>
    gsi1pk: 'string', // USER#<userId>#TYPE#<type>

    // Other fields will be stored but not indexed
    // token: 'string',
    // userId: 'string',
    // type: 'string', // e.g., 'plex'
    // createdAt: 'string',
  },
  primaryIndex: { hashKey: 'pk' },
  globalIndexes: {
    gsi1: {
      hashKey: 'gsi1pk',
      projection: 'all',
    },
  },
});
