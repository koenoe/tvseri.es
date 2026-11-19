/// <reference path="../.sst/platform/config.d.ts" />

import { buildApiEdgeInjection } from './apiEdgeInjection';
import { API_CONCURRENCY, API_WRITE_ROUTES } from './apiWriteRoutes';
import { auth } from './auth';
import { productionReserved } from './concurrency';
import { connectionSyncQueue } from './connectionSync';
import { connections, connectionsKey } from './connections';
import { deleteAccountQueue } from './deleteAccount';
import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { undoImportQueue } from './imports';
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

/**
 * Two functions with the same code, links, environment and permissions (the
 * bulkhead, apiWriteRoutes.ts). In production each has its own reserved
 * concurrency, which also caps its cost under a spike or abuse: requests past
 * it are throttled.
 */
const apiFunctionArgs = {
  environment: {
    CLOUDFRONT_DISTRIBUTION_ID: apiRouter.distributionID,
  },
  handler: 'apps/api/src/index.handler',
  link: [
    auth,
    // Connections: encrypted service sign-ins + link codes (routes/connections.ts)
    connections,
    connectionsKey,
    deleteAccountQueue, // Delete account (routes/me/index.ts)
    dominantColor,
    dynamo.cache,
    dynamo.follow,
    dynamo.lists,
    dynamo.metricsApi,
    dynamo.metricsWebVitals,
    dynamo.preferredImages,
    dynamo.users,
    dynamo.watched,
    dynamo.webhookTokens,
    metricsQueue,
    connectionSyncQueue, // Sync now (routes/me/connections.ts)
    scrobbleQueue,
    secrets.apiKey,
    secrets.mdblistApiKey,
    secrets.omdbApiKey,
    secrets.tmdbApiAccessToken,
    secrets.tmdbApiKey,
    undoImportQueue, // Undo import (routes/me/imports.ts)
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
} satisfies sst.aws.FunctionArgs;

const apiFunction = new sst.aws.Function('ApiFunction', {
  ...apiFunctionArgs,
  concurrency: {
    reserved: productionReserved($app.stage, API_CONCURRENCY.catalogue),
  },
  url: {
    router: {
      instance: apiRouter,
    },
  },
});

// Not routed by SST: the edge picks it per request (apiEdgeInjection.ts).
// Its URL is made below rather than with `url: true`, so the edge's key can
// wait for it and its permissions (SST doesn't expose them).
const apiWriteFunction = new sst.aws.Function('ApiWriteFunction', {
  ...apiFunctionArgs,
  concurrency: {
    reserved: productionReserved($app.stage, API_CONCURRENCY.write),
  },
});

// What SST's `url: true` creates (Function, SST 4.17.2): a public URL with
// the same auth (none) and CORS defaults as ApiFunction's, and the two
// permissions a public function URL needs. The aliases keep the ones stages
// already have from `url: true` (same names, then under the function).
const writeFunctionName = apiWriteFunction.nodes.function.name;
const writeAliases = [{ parent: apiWriteFunction }];
const apiWriteUrl = new aws.lambda.FunctionUrl(
  'ApiWriteFunctionUrl',
  {
    authorizationType: 'NONE',
    cors: { allowHeaders: ['*'], allowMethods: ['*'], allowOrigins: ['*'] },
    functionName: writeFunctionName,
    invokeMode: 'BUFFERED',
  },
  { aliases: writeAliases },
);
const apiWriteUrlPermissions = [
  new aws.lambda.Permission(
    'ApiWriteFunctionPublicFunctionUrlAccess',
    {
      action: 'lambda:InvokeFunctionUrl',
      function: writeFunctionName,
      functionUrlAuthType: 'NONE',
      principal: '*',
    },
    { aliases: writeAliases },
  ),
  new aws.lambda.Permission(
    'ApiWriteFunctionInvokeFunction',
    {
      action: 'lambda:InvokeFunction',
      function: writeFunctionName,
      invokedViaFunctionUrl: true,
      principal: '*',
    },
    { aliases: writeAliases },
  ),
];

// Where the edge finds the write function. Written only once the URL and
// both permissions exist, so routing flips when the target is callable;
// until then the edge keeps every request on ApiFunction. It also waits for
// the Router and ApiFunction (whose route SST writes to the same
// KeyValueStore): two writers at once fail with "Pre-Condition failed".
new aws.cloudfront.KeyvaluestoreKey(
  'ApiWriteOrigin',
  {
    key: API_WRITE_ROUTES.kvKey,
    keyValueStoreArn: routerKvStoreArn,
    value: apiWriteUrl.functionUrl.apply((url) => new URL(url).host),
  },
  {
    dependsOn: [apiWriteUrl, ...apiWriteUrlPermissions, apiRouter, apiFunction],
  },
);
