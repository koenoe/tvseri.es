/// <reference path="../.sst/platform/config.d.ts" />

import { DASHBOARD_READ } from '../packages/constants/src/dashboardRead';
import { auth } from './auth';
import { domain, zone } from './dns';
import { dominantColor } from './dominantColor';
import * as dynamo from './dynamo';
import { email } from './email';
import { metricsQueue } from './metrics';
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
      // Note: this is needed cause SST doesn't minify their code
      // and we hit the size limit for CloudFront functions easily otherwise.

      // Readable version of the minified injection below.
      // To minify: wrap in `function _() { ... }`, minify at https://minify-js.com,
      // then remove the `function _(){` prefix and `}` suffix.
      //
      // Every request needs the API key, except the dashboard's read-only admin
      // calls, which send a Bearer token instead. Those routes verify the token
      // themselves (requireAuthAdmin), so the edge only narrows what can get
      // through without the key: GET/HEAD on the dashboard metrics routes.
      // Anything else under /metrics (e.g. web-vitals ingest) needs the key.
      //
      // var h = event.request.headers;
      // var m = event.request.method;
      // var u = event.request.uri;

      // if (m !== 'OPTIONS') {
      //   var a = h['x-api-key'];
      //   var b = h['authorization'];

      //   var isApiKeyValid = a && a.value === '${k}';
      //   var isDashboardRead =
      //     (m === 'GET' || m === 'HEAD') &&
      //     b && b.value.startsWith('Bearer ') &&
      //     /^\/metrics\/(api|web-vitals\/(summary|routes|countries|devices))(\/|$)/.test(u) &&
      //     !/\.\.|%2e/i.test(u); // no dot segments

      //   if (!(isApiKeyValid || isDashboardRead)) {
      //     return {
      //       statusCode: 401,
      //       statusDescription: 'Unauthorized',
      //       body: { encoding: 'text', data: 'Unauthorized' }
      //     };
      //   }
      // }
      //
      injection: $resolve([secrets.apiKeyRandom.result]).apply(([k]) => {
        // Regex and method list come from @tvseri.es/constants (shared with the
        // Lambda middleware); the regex sources are inlined as JS regex literals.
        const methods = DASHBOARD_READ.methods
          .map((method) => `${JSON.stringify(method)}===t`)
          .join('||');
        const path = `/${DASHBOARD_READ.pathSource}/.test(r)`;
        const dots = `!/${DASHBOARD_READ.dotSegmentSource}/i.test(r)`;
        return `var e=event.request.headers,t=event.request.method,r=event.request.uri;if("OPTIONS"!==t){var a=e["x-api-key"],i=e.authorization,s=a&&"${k}"===a.value,u=(${methods})&&i&&i.value.startsWith("Bearer ")&&${path}&&${dots};if(!s&&!u)return{statusCode:401,statusDescription:"Unauthorized",body:{encoding:"text",data:"Unauthorized"}}}`;
      }),
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

export const apiFunction = new sst.aws.Function('ApiFunction', {
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
