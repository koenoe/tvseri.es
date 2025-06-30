/// <reference path="../.sst/platform/config.d.ts" />

import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { scrobbleQueue } from './scrobbleQueue';
import * as secrets from './secrets';

export const apiRouter = new sst.aws.Router('ApiRouter', {
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: `api.${domain}`,
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
      // biome-ignore lint/suspicious/noExplicitAny: sort out later
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
  architecture: 'arm64',
  environment: {
    CLOUDFRONT_DISTRIBUTION_ID: apiRouter.distributionID,
  },
  handler: 'apps/api/src/index.handler',
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
  memory: '2048 MB',
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
  permissions: [
    {
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        $interpolate`arn:aws:cloudfront::${aws.getCallerIdentityOutput().accountId}:distribution/${apiRouter.distributionID}`,
      ],
    },
  ],
  runtime: 'nodejs22.x',
  timeout: '30 seconds',
  url: {
    router: {
      instance: apiRouter,
    },
  },
});
