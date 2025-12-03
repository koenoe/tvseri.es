/// <reference path="../.sst/platform/config.d.ts" />

import { watched } from './dynamo';
import * as secrets from './secrets';

// One-time migration queue to backfill episodeTitle and episodeStillPath
// Run the enqueue Lambda manually via AWS Console or CLI to start migration
// Remove after migration is complete

export const migrateWatchedQueue = new sst.aws.Queue('MigrateWatchedQueue', {
  fifo: true,
});

// Processor Lambda - triggered by SQS messages
migrateWatchedQueue.subscribe(
  {
    // Limit concurrency to avoid TMDB rate limits (~50 req/sec)
    // With batch size 10 and ~1 TMDB call per unique season, this allows ~50 req/sec
    concurrency: {
      reserved: 5,
    },
    handler: 'apps/api/src/lambdas/migrateWatchedEpisodeData/process.handler',
    link: [watched, secrets.tmdbApiAccessToken, secrets.tmdbApiKey],
    memory: '512 MB',
    nodejs: {
      esbuild: {
        external: ['@aws-sdk/client-dynamodb', '@aws-sdk/util-dynamodb'],
      },
    },
    timeout: '30 seconds',
  },
  {
    batch: {
      // Process items from same series/season together to leverage cache
      // Note: window not supported for FIFO queues
      partialResponses: true,
      size: 10,
    },
  },
);

// Enqueue Lambda - run manually to scan table and send items to queue
export const migrateWatchedEnqueue = new sst.aws.Function(
  'MigrateWatchedEnqueue',
  {
    handler: 'apps/api/src/lambdas/migrateWatchedEpisodeData/enqueue.handler',
    link: [migrateWatchedQueue, watched],
    memory: '512 MB',
    nodejs: {
      esbuild: {
        external: [
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-sqs',
          '@aws-sdk/util-dynamodb',
        ],
      },
    },
    timeout: '15 minutes', // Long timeout for full table scan
  },
);
