/// <reference path="../../.sst/platform/config.d.ts" />

import { dominantColor } from '../dominantColor';
import * as secrets from '../secrets';
import { cache } from './cache';
import { lists } from './lists';
import { preferredImages } from './preferredImages';

export const watched = new sst.aws.Dynamo('Watched', {
  fields: {
    gsi1pk: 'string', // USER#<userId>
    gsi1sk: 'string', // SERIES#<seriesId>#S<seasonNum>#E<episodeNum>
    gsi2pk: 'string', // USER#<userId>#SERIES#<seriesId>
    gsi2sk: 'number', // S001#E001 (for sorting within series)
    pk: 'string', // USER#<userId>#WATCHED
    sk: 'string', // watched_at

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
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all', rangeKey: 'gsi1sk' }, // For series/season queries
    gsi2: { hashKey: 'gsi2pk', projection: 'all', rangeKey: 'gsi2sk' }, // For time-based queries
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  stream: 'new-and-old-images',
});

watched.subscribe(
  'WatchedSubscriber',
  {
    architecture: 'arm64',
    concurrency: {
      reserved: 100,
    },
    handler: 'apps/api/src/lambdas/watched.handler',
    link: [
      cache,
      dominantColor,
      lists,
      preferredImages,
      watched,
      secrets.mdblistApiKey,
      secrets.tmdbApiAccessToken,
      secrets.tmdbApiKey,
    ],
    nodejs: {
      esbuild: {
        external: [
          '@aws-sdk/client-cloudfront',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-lambda',
          '@aws-sdk/client-sesv2',
          '@aws-sdk/client-sqs',
          '@aws-sdk/util-dynamodb',
        ],
      },
      minify: true,
    },
    runtime: 'nodejs22.x',
    timeout: '30 seconds',
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
