/// <reference path="../.sst/platform/config.d.ts" />

import { auth } from './auth';
import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { metricsQueue } from './metricsQueue';
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
      injection: $resolve([secrets.apiKeyRandom.result]).apply(
        ([resolvedApiKey]) =>
          `
          const apiKey = event.request.headers["x-api-key"] && event.request.headers["x-api-key"].value;
          if (!apiKey || apiKey !== "${resolvedApiKey}") {
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
      ),
    },
  },
  transform: {
    cdn: (args) => {
      // Enable additional CloudWatch metrics (cache hit rate, origin latency, etc.)
      // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html
      args.transform = {
        distribution: (distArgs) => {
          // biome-ignore lint/suspicious/noExplicitAny: not in type defs yet
          (distArgs as any).enableAdditionalMetrics = true;
        },
      };
    },
  },
});

export const apiFunction = new sst.aws.Function('ApiFunction', {
  environment: {
    CLOUDFRONT_DISTRIBUTION_ID: apiRouter.distributionID,
  },
  handler: 'apps/api/src/index.handler',
  // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versionsARM.html
  layers:
    $app.stage === 'production'
      ? [
          'arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension-Arm64:21',
        ]
      : [],
  link: [
    auth,
    dominantColor,
    dynamo.cache,
    dynamo.follow,
    dynamo.lists,
    dynamo.metricsApi,
    dynamo.metricsRaw,
    dynamo.metricsWebVitals,
    dynamo.preferredImages,
    dynamo.users,
    dynamo.watched,
    dynamo.webhookTokens,
    email,
    metricsQueue,
    scrobbleQueue,
    secrets.apiKey,
    secrets.mdblistApiKey,
    secrets.tmdbApiAccessToken,
    secrets.tmdbApiKey,
  ],
  memory: '1024 MB',
  nodejs: {
    esbuild: {
      external: [
        '@aws-sdk/client-cloudfront',
        '@aws-sdk/client-dynamodb',
        '@aws-sdk/client-lambda',
        '@aws-sdk/client-sqs',
        '@aws-sdk/util-dynamodb',
      ],
    },
  },
  permissions: [
    {
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        $interpolate`arn:aws:cloudfront::${aws.getCallerIdentityOutput().accountId}:distribution/${apiRouter.distributionID}`,
      ],
    },
  ],
  timeout: '15 seconds',
  url: {
    router: {
      instance: apiRouter,
    },
  },
});
