/// <reference path="../../.sst/platform/config.d.ts" />
import { backedUp } from './backup';

export const webhookTokens = new sst.aws.Dynamo('WebhookTokens', {
  fields: {
    // As apps/api/src/lib/db/webhooks writes them. Never change these fields
    // or the index to "match" anything: that replaces the table.
    gsi1pk: 'string', // USER#<userId>#TYPE#<type> (a user's token per provider)
    pk: 'string', // TOKEN#<token>

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
  transform: backedUp,
});
