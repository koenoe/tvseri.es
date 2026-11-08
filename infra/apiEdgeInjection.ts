import { DASHBOARD_READ } from '../packages/constants/src/dashboardRead';
import {
  SCROBBLE_WEBHOOK_PATH_SOURCE,
  WEBHOOK_TOKEN_KV_PREFIX,
  WEBHOOK_TOKEN_PATTERN_SOURCE,
} from '../packages/constants/src/scrobble';

const UNAUTHORIZED =
  '{ statusCode: 401, statusDescription: "Unauthorized", body: { encoding: "text", data: "Unauthorized" } }';

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
}`;
};
