/// <reference path="../.sst/platform/config.d.ts" />

import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import * as secrets from './secrets';

export const scrobbleQueue = new sst.aws.Queue('ScrobbleQueue');
scrobbleQueue.subscribe(
  {
    architecture: 'arm64',
    concurrency: {
      reserved: 25,
    },
    handler: 'apps/api/src/lambdas/scrobble.handler',
    memory: '512 MB',
    runtime: 'nodejs22.x',
    timeout: '30 seconds',
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
    nodejs: {
      install: ['@better-fetch/fetch', 'slugify'],
      minify: true,
      // Note: this should work and allow usage of `import 'server-only';` in the lambda
      // but it doesn't seem to work as expected: https://github.com/sst/sst/issues/4514
      // esbuild: {
      //   conditions: ['react-server'],
      // },
    },
  },
  {
    // Default = {size: 10, window: “20 seconds”, partialResponses: false}
    batch: {
      size: 25,
      window: '30 seconds',
    },
  },
);
