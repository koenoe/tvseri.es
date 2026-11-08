import { timingSafeEqual } from 'node:crypto';
import {
  DASHBOARD_READ,
  SCROBBLE_WEBHOOK_PATH_SOURCE,
  WEBHOOK_TOKEN_PATTERN_SOURCE,
} from '@tvseri.es/constants';
import type { MiddlewareHandler } from 'hono';
import { Resource } from 'sst';

const apiKey = Buffer.from(Resource.ApiKey.value);

// Dashboard read-only admin routes (they verify the Bearer token themselves)
const DASHBOARD_READ_PATH = new RegExp(DASHBOARD_READ.pathSource);
const DOT_SEGMENT = new RegExp(DASHBOARD_READ.dotSegmentSource, 'i');
const DASHBOARD_READ_METHODS: readonly string[] = DASHBOARD_READ.methods;

// Scrobble webhooks (the route checks the token itself)
const SCROBBLE_WEBHOOK_PATH = new RegExp(SCROBBLE_WEBHOOK_PATH_SOURCE);
const WEBHOOK_TOKEN = new RegExp(WEBHOOK_TOKEN_PATTERN_SOURCE);

const isApiKeyValid = (value: string | undefined) => {
  if (!value) {
    return false;
  }
  const provided = Buffer.from(value);
  return provided.length === apiKey.length && timingSafeEqual(provided, apiKey);
};

/**
 * Requires the API key, mirroring the CloudFront viewer-request function in
 * infra/api.ts exactly, so the Lambda Function URL can't be called directly
 * without it. Traffic through CloudFront already passed the same check.
 *
 * Allowed without the key: OPTIONS, GET/HEAD with a Bearer token on the
 * dashboard metrics routes, and POST on the scrobble webhook route with a
 * well-formed `token` (the edge checked it against the KeyValueStore; the
 * route looks it up before queueing anything).
 */
export const requireApiKey = (): MiddlewareHandler => {
  return async (c, next) => {
    const method = c.req.method;

    if (method === 'OPTIONS' || isApiKeyValid(c.req.header('x-api-key'))) {
      return next();
    }

    const path = c.req.path;
    const isDashboardRead =
      DASHBOARD_READ_METHODS.includes(method) &&
      Boolean(c.req.header('authorization')?.startsWith('Bearer ')) &&
      DASHBOARD_READ_PATH.test(path) &&
      !DOT_SEGMENT.test(path);

    const isScrobbleWebhook =
      method === 'POST' &&
      SCROBBLE_WEBHOOK_PATH.test(path) &&
      WEBHOOK_TOKEN.test(c.req.query('token') ?? '');

    if (isDashboardRead || isScrobbleWebhook) {
      return next();
    }

    return c.text('Unauthorized', 401);
  };
};
