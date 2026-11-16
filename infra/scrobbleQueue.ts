/// <reference path="../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from './alerts';
import { productionReserved } from './concurrency';
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
alarmOnDeadLetters('ScrobbleDLQ', scrobbleDlq);

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
      reserved: productionReserved($app.stage, 25),
    },
    handler: 'apps/api/src/lambdas/scrobble.handler',
    link: [
      dominantColor,
      dynamo.cache,
      dynamo.lists,
      dynamo.preferredImages,
      dynamo.users,
      dynamo.watched,
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
      // Messages run one after another and each can take up to 13.5 s of TMDB
      // retries: 5 keeps a slow batch inside the 30 s timeout (a timeout would
      // lose the partial response and redeliver the whole batch)
      size: 5,
      window: '30 seconds',
    },
  },
);
