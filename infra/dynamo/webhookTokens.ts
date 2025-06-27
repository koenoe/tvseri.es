/// <reference path="../../.sst/platform/config.d.ts" />

export const webhookTokens = new sst.aws.Dynamo('WebhookTokens', {
  fields: {
    gsi1pk: 'string', // TOKEN#<token>
    pk: 'string', // USER#<userId>#TYPE#<type>

    // Other fields will be stored but not indexed
    // token: 'string',
    // userId: 'string',
    // type: 'string', // e.g., 'plex'
    // createdAt: 'string',
  },
  globalIndexes: {
    gsi1: {
      hashKey: 'gsi1pk',
      projection: 'all',
    },
  },
  primaryIndex: { hashKey: 'pk' },
});
