import { DASHBOARD_READ } from '../packages/constants/src/dashboardRead';
import {
  SCROBBLE_WEBHOOK_PATH_SOURCE,
  WEBHOOK_TOKEN_KV_PREFIX,
  WEBHOOK_TOKEN_PATTERN_SOURCE,
} from '../packages/constants/src/scrobble';
import { API_WRITE_ROUTES } from './apiWriteRoutes';

const UNAUTHORIZED =
  '{ statusCode: 401, statusDescription: "Unauthorized", body: { encoding: "text", data: "Unauthorized" } }';

/**
 * The bulkhead (apiWriteRoutes.ts): the viewer's own writes and own-state
 * reads go to the write function, whose URL host the KeyValueStore holds.
 * Everything else, and everything while that key is missing, falls through
 * to SST's routing and so to the catalogue function (the default route).
 *
 * The origin is set as SST's `setUrlOrigin` sets a function URL origin
 * (Router 4.17.2), through CloudFront's documented `updateRequestOrigin`;
 * settings not given (timeouts, Origin Shield) are inherited from the
 * distribution's origin, as they are for SST's routes. Returning the request
 * here skips SST's routing, so the CloudFront default domain is left to
 * SST's code that blocks it. The cache behaviour, and so the cache key, is
 * the distribution's one behaviour either way. Any failure (no key, a
 * refused origin) falls through to SST's routing.
 */
const WRITE_ROUTING = `
  const route = event.request.uri;
  if (
    method !== "OPTIONS" &&
    !/${API_WRITE_ROUTES.dotSegmentSource}/i.test(route) &&
    (method === "GET" || method === "HEAD"
      ? /${API_WRITE_ROUTES.ownStateReadSource}/
      : /${API_WRITE_ROUTES.writePathSource}/
    ).test(route)
  ) {
    try {
      const host = await cf.kvs().get(${JSON.stringify(API_WRITE_ROUTES.kvKey)});
      if (!event.request.headers.host.value.includes("cloudfront.net")) {
        event.request.headers["x-forwarded-host"] = event.request.headers.host;
        cf.updateRequestOrigin({
          domainName: host,
          customOriginConfig: { port: 443, protocol: "https", sslProtocols: ["TLSv1.2"] },
          originAccessControlConfig: { enabled: false },
        });
        return event.request;
      }
    } catch (e) {}
  }`;

/**
 * Code injected at the top of the API Router's viewer-request function, inside
 * SST's `async function handler(event)` (which already has `import cf from
 * "cloudfront"` and the Router's KeyValueStore attached). It's minified at
 * deploy (sst.config.ts), so it stays readable here. Wrapped in a block so its
 * names can't clash with SST's code that follows.
 *
 * Every request needs the API key, except:
 * - OPTIONS;
 * - the dashboard's read-only admin calls: GET/HEAD with a Bearer token on the
 *   dashboard metrics routes, which verify the token themselves
 *   (requireAuthAdmin);
 * - scrobble webhooks: POST on the webhook route with a `token` that's in the
 *   KeyValueStore for that provider. Media servers can't send the API key.
 *
 * Regex sources come from @tvseri.es/constants, shared with the Lambda's
 * middleware/apiKey.ts so the two can't drift.
 */
export const buildApiEdgeInjection = (apiKey: string) => {
  const isDashboardMethod = DASHBOARD_READ.methods
    .map((method) => `method === ${JSON.stringify(method)}`)
    .join(' || ');

  return `{
  const method = event.request.method;
  if (method !== "OPTIONS") {
    const uri = event.request.uri;
    const apiKey = event.request.headers["x-api-key"];
    const authorization = event.request.headers.authorization;
    const isApiKeyValid = apiKey && apiKey.value === ${JSON.stringify(apiKey)};
    const isDashboardRead =
      (${isDashboardMethod}) &&
      authorization &&
      authorization.value.startsWith("Bearer ") &&
      /${DASHBOARD_READ.pathSource}/.test(uri) &&
      !/${DASHBOARD_READ.dotSegmentSource}/i.test(uri);

    let isWebhook = false;
    if (!isApiKeyValid && !isDashboardRead && method === "POST") {
      const webhook = /${SCROBBLE_WEBHOOK_PATH_SOURCE}/.exec(uri);
      const token = event.request.querystring.token;
      if (webhook && token && /${WEBHOOK_TOKEN_PATTERN_SOURCE}/.test(token.value)) {
        try {
          // The value is the token's provider; a missing key throws
          const provider = await cf.kvs().get(${JSON.stringify(WEBHOOK_TOKEN_KV_PREFIX)} + token.value);
          isWebhook = provider === webhook[1];
        } catch (e) {}
      }
    }

    if (!isApiKeyValid && !isDashboardRead && !isWebhook) {
      return ${UNAUTHORIZED};
    }
  }
${WRITE_ROUTING}
}`;
};
