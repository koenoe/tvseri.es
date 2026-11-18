/// <reference path="../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from './alerts';
import { productionReserved } from './concurrency';
import * as dynamo from './dynamo';

/**
 * Undo import: the API queues one message per undo; the consumer
 * deletes the import's watched items (conditional deletes, safe to re-run)
 * and continues in a new message when one run isn't enough.
 */
const undoImportDlq = new sst.aws.Queue('UndoImportDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max)
    },
  },
});
alarmOnDeadLetters('UndoImportDLQ', undoImportDlq);

export const undoImportQueue = new sst.aws.Queue('UndoImportQueue', {
  dlq: {
    queue: undoImportDlq.arn,
    retry: 5, // AWS recommends >= 5 for Lambda consumers (throttles count too)
  },
  // AWS recommends >= 6x the function timeout plus the batching window
  // (6 x 300s), so a message never becomes visible again mid-processing.
  visibilityTimeout: '1800 seconds',
});

undoImportQueue.subscribe(
  {
    // One undo at a time per container; a few users at once at most
    concurrency: {
      reserved: productionReserved($app.stage, 2),
    },
    handler: 'apps/api/src/lambdas/undoImport.handler',
    // Only what it touches: watched items, the user's lastImport, the skips
    // it puts back (prefs rows in Lists), and its own queue for continuations.
    link: [dynamo.lists, dynamo.users, dynamo.watched, undoImportQueue],
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
