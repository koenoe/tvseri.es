/// <reference path="../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters, alarmOnLogLine } from './alerts';
import { connections, connectionsKey, connectionsKmsKey } from './connections';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import * as secrets from './secrets';

/**
 * Connection sync for every service: the API claims a run and queues it; the
 * consumer reads the history page by page, writes the matches and
 * checkpoints, and continues in a new message when one run isn't enough.
 */
const connectionSyncDlq = new sst.aws.Queue('ConnectionSyncDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max)
    },
  },
});
alarmOnDeadLetters('ConnectionSyncDLQ', connectionSyncDlq);

export const connectionSyncQueue = new sst.aws.Queue('ConnectionSyncQueue', {
  dlq: {
    queue: connectionSyncDlq.arn,
    retry: 5, // AWS recommends >= 5 for Lambda consumers (throttles count too)
  },
  // Twice the 900s function timeout: a message never becomes visible again
  // while a step still runs on it, and a step that crashed is retried after
  // half an hour rather than 90 minutes. AWS's 6x advice covers throttled
  // receives; the maximum concurrency below keeps the poller from taking
  // messages it has no room for, so none are throttled.
  visibilityTimeout: '1800 seconds',
});

const connectionSync = connectionSyncQueue.subscribe(
  {
    handler: 'apps/api/src/lambdas/connectionSync.handler',
    // Only this function may open a stored session; the queue is for its
    // own continuations
    link: [
      connections,
      connectionsKey,
      dominantColor,
      dynamo.cache,
      dynamo.lists,
      dynamo.preferredImages,
      dynamo.users,
      dynamo.watched,
      connectionSyncQueue,
      secrets.tmdbApiAccessToken,
      secrets.tmdbApiKey,
    ],
    memory: '512 MB',
    permissions: [
      {
        actions: ['kms:Decrypt'],
        resources: [connectionsKmsKey.arn],
      },
    ],
    timeout: '900 seconds',
  },
  {
    batch: {
      partialResponses: true, // handler returns batchItemFailures per message
      size: 1,
    },
    transform: {
      eventSourceMapping: (args) => {
        // Five drain a night's runs (each mostly waiting on the service)
        // and stay at 25 TMDB calls a second under the background budget
        // (lib/upstream/budget.ts). Maximum concurrency, not reserved: with
        // SQS, reserved concurrency throttles messages already taken, which
        // then burn retries towards the DLQ. The run's claim on the
        // connection (lib/db/connections/sync.ts) stops one user running twice.
        args.scalingConfig = { maximumConcurrency: 5 };
      },
    },
  },
);

// A service changed its pages: the run fails as handled, so no message
// dead-letters. Only that failure logs at error level with "run failed"
// (lib/connections/sync.ts, logRunEnd); its reader needs work.
alarmOnLogLine(
  'ConnectionSyncReaderChanged',
  connectionSync.nodes.function.apply(
    (fn) => fn.nodes.function.loggingConfig.logGroup,
  ),
  '"ERROR" "run failed"',
  'A streaming service changed: its history reader can no longer read it',
);

/**
 * Queues a run for every linked connection each night. It never opens a
 * session, so it has no decrypt grant.
 */
new sst.aws.Cron('ConnectionSyncNightly', {
  function: {
    handler: 'apps/api/src/lambdas/connectionSyncNightly.handler',
    link: [connections, connectionSyncQueue],
    memory: '256 MB',
    // A scan plus a claim per connection, ten at a time: room for thousands
    timeout: '900 seconds',
  }, // 04:00 UTC, daily: after UK evenings' viewing
  schedule: 'cron(0 4 * * ? *)',
});
