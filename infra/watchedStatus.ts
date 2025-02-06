/// <reference path="../.sst/platform/config.d.ts" />

import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';

export const watchedStatusQueue = new sst.aws.Queue(
  'ValidateWatchedStatusQueue',
);
watchedStatusQueue.subscribe({
  architecture: 'arm64',
  handler: 'src/lambdas/validateWatchedStatusQueue.handler',
  memory: '512 MB',
  runtime: 'nodejs22.x',
  timeout: '30 seconds',
  environment: {
    MDBLIST_API_KEY: process.env.MDBLIST_API_KEY as string,
    TMDB_API_ACCESS_TOKEN: process.env.TMDB_API_ACCESS_TOKEN as string,
    TMDB_API_KEY: process.env.TMDB_API_KEY as string,
  },
  link: [
    dominantColor,
    dynamo.cache,
    dynamo.lists,
    dynamo.preferredImages,
    dynamo.users,
    dynamo.watched,
  ],
  nodejs: {
    install: ['@better-fetch/fetch', 'slugify'],
    minify: true,
  },
});

export const watchedStatusCron = new sst.aws.Cron('ValidateWatchedStatus', {
  schedule: 'cron(0 5 * * ? *)', // 05:00 UTC, daily
  function: {
    architecture: 'arm64',
    handler: 'src/lambdas/validateWatchedStatusCron.handler',
    memory: '512 MB',
    runtime: 'nodejs22.x',
    timeout: '30 seconds',
    link: [dynamo.users, watchedStatusQueue],
    nodejs: {
      minify: true,
    },
  },
});
