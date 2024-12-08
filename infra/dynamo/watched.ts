/// <reference path="../../.sst/platform/config.d.ts" />

export const watched = new sst.aws.Dynamo('Watched', {
  fields: {
    pk: 'string', // USER#<userId>
    sk: 'string', // SERIES#<seriesId>#S<seasonNum>#E<episodeNum>
    gsi1pk: 'string', // USER#<userId>#SERIES#<seriesId>
    gsi1sk: 'string', // S001#E001 (for sorting within series)
    gsi2pk: 'string', // USER#<userId>#WATCHED
    gsi2sk: 'number', // watched_at

    // country: 'string', // iso_3166_1
    // episodeNumber: 'number',
    // genreIds: 'string', // comma-separated
    // language: 'string', // iso_639_1
    // posterImage: 'string', // deprecated
    // posterPath: 'string',
    // runtime: 'number',
    // seasonNumber: 'number',
    // seriesId: 'number',
    // slug: 'string',
    // title: 'string',
    // watchProviderLogoPath: 'string',
    // watchProviderName: 'string',
    // watchedAt: 'number'
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk', projection: 'all' }, // For series/season queries
    gsi2: { hashKey: 'gsi2pk', rangeKey: 'gsi2sk', projection: 'all' }, // For time-based queries
  },
  // stream: 'new-and-old-images',
});

// Note: just leave this here for future reference
// watched.subscribe('WatchedSubscriber', {
//   architecture: 'arm64',
//   handler: 'infra/functions/watched.handler',
//   memory: '1024 MB',
//   runtime: 'nodejs22.x',
//   timeout: '10 seconds',
//   link: [lists, watched],
// });
