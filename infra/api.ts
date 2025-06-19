/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { scrobbleQueue } from './scrobbleQueue';
import * as secrets from './secrets';

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
        const apiKey = event.request.headers["x-api-key"] && event.request.headers["x-api-key"].value;
        if (!apiKey || apiKey !== "${secrets.apiKey.value}") {
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
    install: ['@better-fetch/fetch', 'hono', 'slugify'],
    minify: true,
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
    secrets.apiKey,
    secrets.mdblistApiKey,
    secrets.tmdbApiAccessToken,
    secrets.tmdbApiKey,
    secrets.secretKey,
  ],
});
