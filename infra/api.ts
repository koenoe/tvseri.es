/// <reference path="../.sst/platform/config.d.ts" />

import { buildApiEdgeInjection } from './apiEdgeInjection';
import { auth } from './auth';
import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { metricsQueue } from './metrics';
import { scrobbleQueue } from './scrobbleQueue';
import * as secrets from './secrets';
import { watchedStatusQueue } from './watchedStatus';

export const apiRouter = new sst.aws.Router('ApiRouter', {
  domain: {
    dns: sst.aws.dns({
      zone,
    }),
    name: `api.${domain}`,
  },
  edge: {
    viewerRequest: {
      // API key check, plus the dashboard-read and scrobble-webhook
      // exceptions: see apiEdgeInjection.ts
      injection: $resolve([secrets.apiKeyRandom.result]).apply(([apiKey]) =>
        buildApiEdgeInjection(apiKey),
      ),
    },
  },
  transform: {
    cachePolicy: (args) => {
      // Only cache what the origin explicitly allows: with minTtl 0, CloudFront
      // honours `Cache-Control: private` / `no-store` / `no-cache` and won't store
      // the response. Pinned here so an SST default change can't alter it.
      args.minTtl = 0;
      args.defaultTtl = 0;
      args.parametersInCacheKeyAndForwardedToOrigin = {
        ...args.parametersInCacheKeyAndForwardedToOrigin,
        headersConfig: {
          headerBehavior: 'whitelist',
          headers: {
            // Authorization is deliberately NOT part of the cache key: that would
            // fragment the CDN cache per user for public data (e.g. series).
            // Authenticated responses are `private, no-store` (middleware/auth.ts),
            // so CloudFront never stores them in the first place.
            items: ['Origin'],
          },
        },
      };
    },
  },
});

/**
 * The Router's KeyValueStore also holds the scrobble webhook tokens
 * (`wh:<token>` → provider), which the edge function checks
 * (apiEdgeInjection.ts). The API writes them when a token is generated.
 * `_kvStoreArn` is SST-internal: recheck it after SST upgrades.
 */
const routerKvStoreArn = apiRouter._kvStoreArn;
if (!routerKvStoreArn) {
  throw new Error('ApiRouter has no KeyValueStore (inline routes?)');
}

export const webhookTokensKvs = new sst.Linkable('WebhookTokensKvs', {
  include: [
    sst.aws.permission({
      actions: [
        'cloudfront-keyvaluestore:DescribeKeyValueStore',
        'cloudfront-keyvaluestore:UpdateKeys',
      ],
      resources: [routerKvStoreArn],
    }),
  ],
  properties: {
    arn: routerKvStoreArn,
  },
});

export const apiFunction = new sst.aws.Function('ApiFunction', {
  // Caps the API's concurrent executions (and so its cost under a traffic
  // spike or abuse); requests past it are throttled
  concurrency: {
    reserved: 100,
  },
  environment: {
    CLOUDFRONT_DISTRIBUTION_ID: apiRouter.distributionID,
  },
  handler: 'apps/api/src/index.handler',
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
    watchedStatusQueue, // on-visit re-check for inactive users (middleware/auth.ts)
    webhookTokensKvs,
  ],
  memory: '1024 MB',
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
    // TODO: if we want cors in Hono, set this to false and configure in Hono
    // cors: false,
    router: {
      instance: apiRouter,
    },
  },
});
