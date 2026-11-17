/// <reference path="../../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from '../alerts';
import { productionReserved } from '../concurrency';
import { dominantColor } from '../dominantColor';
import * as secrets from '../secrets';
import { cache } from './cache';
import { lists } from './lists';
import { preferredImages } from './preferredImages';
import { users } from './users';

export const watched = new sst.aws.Dynamo('Watched', {
  fields: {
    // Comments describe what apps/api/src/lib/db/watched writes. Never change
    // these fields or the indexes to "match" anything: that rebuilds a GSI or
    // replaces the table.
    gsi1pk: 'string', // USER#<userId>#SERIES#<seriesId> (one show's episodes)
    gsi1sk: 'string', // S001#E001
    gsi2pk: 'string', // USER#<userId>#WATCHED (history; absent on undated "I don't remember" items)
    gsi2sk: 'number', // watchedAt (epoch ms)
    pk: 'string', // USER#<userId>
    sk: 'string', // SERIES#<seriesId>#S001#E001

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
    // dateUnknown: true (optional; then no gsi2 keys)
    // importId: 'string' (optional; written by imports, used by Undo)
  },
  globalIndexes: {
    gsi1: { hashKey: 'gsi1pk', projection: 'all', rangeKey: 'gsi1sk' }, // A show's / a season's episodes
    gsi2: { hashKey: 'gsi2pk', projection: 'all', rangeKey: 'gsi2sk' }, // History by date (dated items only)
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
alarmOnDeadLetters('WatchedSubscriberDLQ', watchedSubscriberDlq);

watched.subscribe(
  'WatchedSubscriber',
  {
    // Caps parallel TMDB/DynamoDB fan-out from stream shards.
    concurrency: {
      reserved: productionReserved($app.stage, 10),
    },
    handler: 'apps/api/src/lambdas/watched.handler',
    link: [
      cache,
      dominantColor,
      lists,
      preferredImages,
      users, // lastActiveAt (markUserActive)
      watched,
      watchedSubscriberDlq,
      secrets.tmdbApiAccessToken,
      secrets.tmdbApiKey,
    ],
    memory: '512 MB',
    timeout: '30 seconds',
  },
  {
    transform: {
      eventSourceMapping: {
        // One sync per user+show covers more of an import per batch; two
        // batches per shard in flight (records of one user stay in order:
        // Lambda keeps per-partition-key order with a parallelization
        // factor). Shards × 2 stays under production's reserved 10. All three are
        // UpdateEventSourceMapping fields: changed in place, no replacement.
        batchSize: 100,
        // Split a failing batch in half on each retry to isolate a poison record.
        bisectBatchOnFunctionError: true,
        destinationConfig: {
          onFailure: {
            destinationArn: watchedSubscriberDlq.arn,
          },
        },
        maximumBatchingWindowInSeconds: 2,
        // A stuck shard drops records after 6 hours instead of the stream's
        // 24 h retention (to the DLQ, alarmed). What they would have done is
        // healed by the next mark of the show (lists and summary rebuilt
        // whole from the show's items), the nightly job (counters, summaries,
        // a dropped mark of the last 48 hours) and the years list's cache life.
        maximumRecordAgeInSeconds: 21_600,
        maximumRetryAttempts: 10,
        parallelizationFactor: 2,
      },
    },
  },
);
