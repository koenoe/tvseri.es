/// <reference path="../.sst/platform/config.d.ts" />

import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';

export const scrobbleQueue = new sst.aws.Queue('ScrobbleQueue');
scrobbleQueue.subscribe({
  architecture: 'arm64',
  handler: 'src/lambdas/scrobble.handler',
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
    // Note: this should work and allow usage of `import 'server-only';` in the lambda
    // but it doesn't seem to work as expected: https://github.com/sst/sst/issues/4514
    // esbuild: {
    //   conditions: ['react-server'],
    // },
  },
});
