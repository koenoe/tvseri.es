/// <reference path="../../.sst/platform/config.d.ts" />

import { dominantColor } from '../dominantColor';
import { cache } from './cache';
import { lists } from './lists';
import { preferredImages } from './preferredImages';

export const watched = new sst.aws.Dynamo('Watched', {
  fields: {
    pk: 'string', // USER#<userId>
    sk: 'string', // SERIES#<seriesId>#S<seasonNum>#E<episodeNum>
    gsi1pk: 'string', // USER#<userId>#SERIES#<seriesId>
    gsi1sk: 'string', // S001#E001 (for sorting within series)
    gsi2pk: 'string', // USER#<userId>#WATCHED
    gsi2sk: 'number', // watched_at

    // episodeNumber: 'number',
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
  stream: 'new-and-old-images',
});

watched.subscribe(
  'WatchedSubscriber',
  {
    architecture: 'arm64',
    concurrency: {
      reserved: 100,
    },
    handler: 'apps/web/src/lambdas/watched.handler',
    memory: '512 MB',
    runtime: 'nodejs22.x',
    timeout: '30 seconds',
    link: [cache, dominantColor, lists, preferredImages, watched],
    environment: {
      MDBLIST_API_KEY: process.env.MDBLIST_API_KEY as string,
      TMDB_API_ACCESS_TOKEN: process.env.TMDB_API_ACCESS_TOKEN as string,
      TMDB_API_KEY: process.env.TMDB_API_KEY as string,
    },
    nodejs: {
      install: ['@better-fetch/fetch', 'slugify'],
      minify: true,
    },
  },
  {
    transform: {
      eventSourceMapping: {
        batchSize: 25,
        maximumBatchingWindowInSeconds: 2,
        maximumRetryAttempts: 10,
      },
    },
  },
);
