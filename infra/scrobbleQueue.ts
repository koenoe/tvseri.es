/// <reference path="../.sst/platform/config.d.ts" />

import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import * as secrets from './secrets';

/**
 * Scrobbles that still fail after all retries (e.g. a persistent TMDB error).
 */
const scrobbleDlq = new sst.aws.Queue('ScrobbleDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max)
    },
  },
});

export const scrobbleQueue = new sst.aws.Queue('ScrobbleQueue', {
  dlq: {
    queue: scrobbleDlq.arn,
    retry: 5, // AWS recommends >= 5 for Lambda consumers (throttles count too)
  },
  // AWS recommends >= 6x the function timeout plus the batching window
  // (6 x 30s + 30s), so a message never becomes visible again mid-processing.
  visibilityTimeout: '210 seconds',
});
scrobbleQueue.subscribe(
  {
    concurrency: {
      reserved: 25,
    },
    handler: 'apps/api/src/lambdas/scrobble.handler',
    link: [
      dominantColor,
      dynamo.cache,
      dynamo.lists,
      dynamo.preferredImages,
      dynamo.users,
      dynamo.watched,
      secrets.mdblistApiKey,
      secrets.tmdbApiAccessToken,
      secrets.tmdbApiKey,
    ],
    memory: '512 MB',
    timeout: '30 seconds',
  },
  {
    // Default = {size: 10, window: “20 seconds”, partialResponses: false}
    batch: {
      partialResponses: true, // handler returns batchItemFailures per message
      size: 25,
      window: '30 seconds',
    },
  },
);
