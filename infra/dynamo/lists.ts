/// <reference path="../../.sst/platform/config.d.ts" />

export const lists = new sst.aws.Dynamo('Lists', {
  fields: {
    gsi1pk: 'string', // USER#<userId>
    gsi1sk: 'string', // LIST#CUSTOM#<listId> or LIST#WATCHLIST or LIST#FAVORITES or LIST#<listId>#ITEM#<tmdbId>
    gsi2pk: 'string', // LIST#<userId>#<listId>
    gsi2sk: 'number', // title (lowercase)
    gsi3pk: 'string', // LIST#<userId>#<listId>
    gsi3sk: 'number', // created_at
    gsi4pk: 'string', // LIST#<userId>#<listId> (only for custom lists)
    pk: 'string', // position (only for custom lists)
    sk: 'string', // SERIES#<tmdbId>

    // listId: 'string',
    // id: 'number',
    // posterImage: 'string', // deprecated
    // posterPath: 'string',
    // title: 'string',
    // slug: 'string',
    // status: 'string', // status of series
    // description: 'string',
    // createdAt: 'number',
    // position: 'number', // Optional, only for custom lists
  },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all', rangeKey: 'gsi1sk' },
    gsi2: { hashKey: 'gsi2pk', projection: 'all', rangeKey: 'gsi2sk' },
    gsi3: { hashKey: 'gsi3pk', projection: 'all', rangeKey: 'gsi3sk' },
    gsi4: { hashKey: 'gsi4pk', projection: 'all' },
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
});
