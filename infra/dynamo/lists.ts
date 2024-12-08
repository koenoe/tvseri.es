/// <reference path="../../.sst/platform/config.d.ts" />

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
    // posterImage: 'string', // deprecated
    // posterPath: 'string',
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
