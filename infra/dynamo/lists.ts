/// <reference path="../../.sst/platform/config.d.ts" />

export const lists = new sst.aws.Dynamo('Lists', {
  fields: {
    // Comments describe what apps/api/src/lib/db/list writes. Never change
    // these fields or the indexes to "match" anything: that rebuilds a GSI or
    // replaces the table.
    gsi1pk: 'string', // LIST#<userId>#<LIST> (list by title)
    gsi1sk: 'string', // title, lowercase
    gsi2pk: 'string', // LIST#<userId>#<LIST> (list by date)
    gsi2sk: 'number', // createdAt (epoch ms)
    gsi3pk: 'string', // LIST#<userId>#<listId> (custom lists only; never written today)
    gsi3sk: 'number', // position (custom lists only)
    gsi4pk: 'string', // SERIES#<tmdbId> (every user's items for a show; not read today)
    pk: 'string', // USER#<userId>
    sk: 'string', // LIST#<LIST>#ITEM#<tmdbId> (LIST = WATCHED, IN_PROGRESS, WATCHLIST, FAVORITES, RESUMING_SOON), or PREF#SERIES#<tmdbId> (per-show prefs, no GSI keys)

    // List items: id, title, slug, posterPath, posterImage (deprecated),
    // status, createdAt, position (custom lists only)
    // Prefs: seriesId, skipped (string set), firstTrackingAnsweredAt,
    // neverAskBefore, paused, pausedAt, updatedAt
  },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all', rangeKey: 'gsi1sk' },
    gsi2: { hashKey: 'gsi2pk', projection: 'all', rangeKey: 'gsi2sk' },
    gsi3: { hashKey: 'gsi3pk', projection: 'all', rangeKey: 'gsi3sk' },
    gsi4: { hashKey: 'gsi4pk', projection: 'all' },
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
});
