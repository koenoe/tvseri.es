/// <reference path="../.sst/platform/config.d.ts" />

import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import * as secrets from './secrets';

export const watchedStatusQueue = new sst.aws.Queue(
  'ValidateWatchedStatusQueue',
);
watchedStatusQueue.subscribe(
  {
    architecture: 'arm64',
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
    memory: '512 MB',
    nodejs: {
      esbuild: {
        external: [
          '@aws-sdk/client-cloudfront',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-lambda',
          '@aws-sdk/client-sesv2',
          '@aws-sdk/client-sqs',
          '@aws-sdk/util-dynamodb',
        ],
      },
      minify: true,
    },
    runtime: 'nodejs22.x',
    timeout: '20 seconds',
  },
  {
    // Default = {size: 10, window: “20 seconds”, partialResponses: false}
    batch: {
      size: 25,
      window: '1 minute',
    },
  },
);

export const watchedStatusCron = new sst.aws.Cron('ValidateWatchedStatus', {
  function: {
    architecture: 'arm64',
    handler: 'apps/api/src/lambdas/validateWatchedStatusCron.handler',
    link: [dynamo.users, watchedStatusQueue],
    memory: '512 MB',
    nodejs: {
      esbuild: {
        external: [
          '@aws-sdk/client-cloudfront',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-lambda',
          '@aws-sdk/client-sesv2',
          '@aws-sdk/client-sqs',
          '@aws-sdk/util-dynamodb',
        ],
      },
      minify: true,
    },
    runtime: 'nodejs22.x',
    timeout: '30 seconds',
  }, // 05:00 UTC, daily
  schedule: 'cron(0 5 * * ? *)',
});
