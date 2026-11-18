/// <reference path="../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from './alerts';
import { auth } from './auth';
import { productionReserved } from './concurrency';
import * as dynamo from './dynamo';

/** Account deletion's queued steps: apps/api/src/lib/account/README.md */
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

/**
 * The auth service's storage, for the user's sign-ins (refresh rows): only
 * what deleting one user's partitions needs, not the whole table
 */
const authSignIns = new sst.Linkable('AuthSignIns', {
  include: [
    sst.aws.permission({
      actions: ['dynamodb:BatchWriteItem', 'dynamodb:Query'],
      resources: [auth.nodes.table.arn],
    }),
  ],
  properties: {
    name: auth.nodes.table.name,
  },
});

deleteAccountQueue.subscribe(
  {
    concurrency: {
      reserved: productionReserved($app.stage, 2),
    },
    handler: 'apps/api/src/lambdas/deleteAccount.handler',
    // Only the tables it deletes from, and its own queue for the next steps
    link: [
      authSignIns,
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
