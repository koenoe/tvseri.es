/// <reference path="../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from './alerts';
import { productionReserved } from './concurrency';
import * as dynamo from './dynamo';

/**
 * Delete account: the API stamps the request, removes the Plex link and
 * queues the first step; the consumer deletes follows and watched history,
 * then (15 minutes later, once the watched stream settled) lists, prefs,
 * cache keys and the user, then sweeps once more. Every step is safe to
 * re-run and refuses users who didn't ask.
 */
const deleteAccountDlq = new sst.aws.Queue('DeleteAccountDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max)
    },
  },
});
alarmOnDeadLetters('DeleteAccountDLQ', deleteAccountDlq);

export const deleteAccountQueue = new sst.aws.Queue('DeleteAccountQueue', {
  dlq: {
    queue: deleteAccountDlq.arn,
    retry: 5, // AWS recommends >= 5 for Lambda consumers (throttles count too)
  },
  // AWS recommends >= 6x the function timeout (6 x 300s)
  visibilityTimeout: '1800 seconds',
});

deleteAccountQueue.subscribe(
  {
    concurrency: {
      reserved: productionReserved($app.stage, 2),
    },
    handler: 'apps/api/src/lambdas/deleteAccount.handler',
    // Only the tables it deletes from, and its own queue for the next steps
    link: [
      deleteAccountQueue,
      dynamo.cache,
      dynamo.follow,
      dynamo.lists,
      dynamo.users,
      dynamo.watched,
    ],
    memory: '512 MB',
    timeout: '300 seconds',
  },
  {
    batch: {
      partialResponses: true, // handler returns batchItemFailures per message
      size: 1,
    },
  },
);
