/// <reference path="../.sst/platform/config.d.ts" />

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
      reserved: 25,
    },
    handler: 'apps/api/src/lambdas/validateWatchedStatusQueue.handler',
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
    timeout: '60 seconds',
  },
  {
    // Default = {size: 10, window: “20 seconds”, partialResponses: false}
    batch: {
      partialResponses: true, // handler returns batchItemFailures per message
      size: 25,
      window: '1 minute',
    },
  },
);

export const watchedStatusCron = new sst.aws.Cron('ValidateWatchedStatus', {
  function: {
    handler: 'apps/api/src/lambdas/validateWatchedStatusCron.handler',
    link: [dynamo.users, watchedStatusQueue],
    memory: '512 MB',
    // Scans all users and queues them; 10s stopped scaling at a few thousand users
    timeout: '60 seconds',
  }, // 03:00 UTC, daily
  schedule: 'cron(0 3 * * ? *)',
});
