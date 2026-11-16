/// <reference path="../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from './alerts';
import { productionReserved } from './concurrency';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import * as secrets from './secrets';

/**
 * Users whose validation still fails after all retries.
 */
const watchedStatusDlq = new sst.aws.Queue('ValidateWatchedStatusDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max)
    },
  },
});
alarmOnDeadLetters('ValidateWatchedStatusDLQ', watchedStatusDlq);

export const watchedStatusQueue = new sst.aws.Queue(
  'ValidateWatchedStatusQueue',
  {
    dlq: {
      queue: watchedStatusDlq.arn,
      retry: 5, // AWS recommends >= 5 for Lambda consumers (throttles count too)
    },
    // AWS recommends >= 6x the function timeout plus the batching window
    // (6 x 60s + 60s), so a message never becomes visible again mid-processing.
    visibilityTimeout: '420 seconds',
  },
);
watchedStatusQueue.subscribe(
  {
    concurrency: {
      reserved: productionReserved($app.stage, 25),
    },
    handler: 'apps/api/src/lambdas/validateWatchedStatusQueue.handler',
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
    timeout: '60 seconds',
  },
  {
    // Default = {size: 10, window: “20 seconds”, partialResponses: false}
    batch: {
      partialResponses: true, // handler returns batchItemFailures per message
      // Users run one after another in a 60 s Lambda: 10 keeps a batch with
      // heavy users on a Monday's full check inside it (SQS BatchSize, an
      // in-place UpdateEventSourceMapping change)
      size: 10,
      window: '1 minute',
    },
    transform: {
      eventSourceMapping: (args) => {
        // At most 5 concurrent invocations: the nightly burst spreads out
        // instead of fanning out to TMDB and DynamoDB all at once. Messages
        // wait in the queue meanwhile (no throttling, so no retries burned).
        // Stays below the reserved concurrency above (production).
        args.scalingConfig = { maximumConcurrency: 5 };
      },
    },
  },
);

new sst.aws.Cron('ValidateWatchedStatus', {
  function: {
    handler: 'apps/api/src/lambdas/validateWatchedStatusCron.handler',
    link: [dynamo.users, watchedStatusQueue],
    memory: '512 MB',
    // Queries the users active in the last 30 days (sparse `active` index) and
    // queues them; 10s stopped scaling at a few thousand users
    timeout: '60 seconds',
  }, // 03:00 UTC, daily
  schedule: 'cron(0 3 * * ? *)',
});
