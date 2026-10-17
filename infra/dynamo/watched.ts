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

/**
 * Receives metadata (shard + sequence range) of stream batches that still fail
 * after all retries, so they can be inspected and replayed instead of being
 * dropped silently.
 */
const watchedSubscriberDlq = new sst.aws.Queue('WatchedSubscriberDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max)
    },
  },
});

watched.subscribe(
  'WatchedSubscriber',
  {
    architecture: 'arm64',
    // Caps parallel TMDB/DynamoDB fan-out from stream shards (owner decision).
    concurrency: {
      reserved: 10,
    },
    handler: 'apps/api/src/lambdas/watched.handler',
    link: [
      cache,
      dominantColor,
      lists,
      preferredImages,
      watched,
      watchedSubscriberDlq,
      secrets.mdblistApiKey,
      secrets.tmdbApiAccessToken,
      secrets.tmdbApiKey,
    ],
    memory: '512 MB',
    runtime: 'nodejs24.x',
    timeout: '30 seconds',
  },
  {
    transform: {
      eventSourceMapping: {
        batchSize: 25,
        // Split a failing batch in half on each retry to isolate a poison record.
        bisectBatchOnFunctionError: true,
        destinationConfig: {
          onFailure: {
            destinationArn: watchedSubscriberDlq.arn,
          },
        },
        maximumBatchingWindowInSeconds: 2,
        maximumRetryAttempts: 10,
      },
    },
  },
);
