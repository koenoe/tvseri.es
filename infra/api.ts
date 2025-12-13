/// <reference path="../.sst/platform/config.d.ts" />

import { CORS_CONFIG } from '../packages/constants/src';

import { auth } from './auth';
import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { metricsQueue } from './metrics';
import { scrobbleQueue } from './scrobbleQueue';
import * as secrets from './secrets';

// Build CORS values for edge function injection
const corsOriginCheck = CORS_CONFIG.originPatterns
  .map((pattern) => `/${pattern}/.test(origin)`)
  .join(' || ');
const corsMethods = CORS_CONFIG.allowMethods.join(', ');
const corsHeaders = CORS_CONFIG.allowHeaders.join(', ');
const corsCredentials = String(CORS_CONFIG.credentials);
const corsMaxAge = String(CORS_CONFIG.maxAge);

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
          const method = event.request.method;
          const uri = event.request.uri;
          const origin = event.request.headers["origin"]?.value || "";

          // Handle CORS preflight requests at the edge
          if (method === 'OPTIONS') {
            const isAllowedOrigin = ${corsOriginCheck};
            return {
              statusCode: 204,
              statusDescription: 'No Content',
              headers: {
                "access-control-allow-origin": { value: isAllowedOrigin ? origin : "" },
                "access-control-allow-methods": { value: "${corsMethods}" },
                "access-control-allow-headers": { value: "${corsHeaders}" },
                "access-control-allow-credentials": { value: "${corsCredentials}" },
                "access-control-max-age": { value: "${corsMaxAge}" },
              },
            };
          }

          const isMetrics = uri.startsWith('/metrics');
          const authHeader = isMetrics ? event.request.headers["authorization"] : event.request.headers["x-api-key"];
          const auth = authHeader && authHeader.value;
          const isValid = isMetrics ? (auth && auth.startsWith("Bearer ")) : auth === "${resolvedApiKey}";
          if (!isValid) {
            return {
              statusCode: 401,
              statusDescription: 'Unauthorized',
              body: {
                encoding: "text",
                data: '<html><head><title>401 Unauthorized</title></head><body><center><h1>401 Unauthorized</h1></center></body></html>'
              }
            };
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
