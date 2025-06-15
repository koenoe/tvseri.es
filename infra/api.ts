/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { scrobbleQueue } from './scrobbleQueue';

const VALID_API_KEYS = [process.env.API_KEY_WEB];

export const apiRouter = new sst.aws.Router('ApiRouter', {
  domain: {
    name: `api.${domain}`,
    dns: sst.aws.dns({
      zone,
    }),
  },
  edge: {
    viewerRequest: {
      injection: $interpolate`
        const validApiKeys = ${JSON.stringify(VALID_API_KEYS)};
        const apiKey = event.request.headers["x-api-key"] && event.request.headers["x-api-key"].value;
        if (!apiKey || !validApiKeys.includes(apiKey)) {
          return {
            statusCode: 401,
            statusDescription: 'Unauthorized',
            body: {
              encoding: "text",
              data: '<html><head><title>401 Unauthorized</title></head><body><center><h1>401 Unauthorized</h1></center></body></html>'
            }
          }
        }
      `,
    },
  },
  transform: {
    cdn: (options) => {
      const origins = (options.origins || []) as any[];
      options.origins = origins.map((origin) => ({
        ...origin,
        originShield: {
          enabled: true,
          originShieldRegion: $app.providers?.aws.region ?? 'eu-west-2',
        },
      }));
    },
  },
});

export const apiFunction = new sst.aws.Function('ApiFunction', {
  handler: 'apps/api/src/index.handler',
  architecture: 'arm64',
  memory: '512 MB',
  runtime: 'nodejs22.x',
  timeout: '30 seconds',
  nodejs: {
    minify: true,
  },
  environment: {
    MDBLIST_API_KEY: process.env.MDBLIST_API_KEY as string,
    TMDB_API_ACCESS_TOKEN: process.env.TMDB_API_ACCESS_TOKEN as string,
    TMDB_API_KEY: process.env.TMDB_API_KEY as string,
  },
  url: {
    router: {
      instance: apiRouter,
    },
  },
  link: [
    dominantColor,
    dynamo.cache,
    dynamo.follow,
    dynamo.lists,
    dynamo.otp,
    dynamo.preferredImages,
    dynamo.sessions,
    dynamo.users,
    dynamo.watched,
    dynamo.webhookTokens,
    email,
    scrobbleQueue,
  ],
});
