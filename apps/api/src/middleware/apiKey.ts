import { timingSafeEqual } from 'node:crypto';
import { DASHBOARD_READ } from '@tvseri.es/constants';
import type { MiddlewareHandler } from 'hono';
import { Resource } from 'sst';

const apiKey = Buffer.from(Resource.ApiKey.value);

// Dashboard read-only admin routes (they verify the Bearer token themselves)
const DASHBOARD_READ_PATH = new RegExp(DASHBOARD_READ.pathSource);
const DOT_SEGMENT = new RegExp(DASHBOARD_READ.dotSegmentSource, 'i');
const DASHBOARD_READ_METHODS: readonly string[] = DASHBOARD_READ.methods;

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
 * Allowed without the key: OPTIONS, and GET/HEAD with a Bearer token on the
 * dashboard metrics routes.
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

    if (isDashboardRead) {
      return next();
    }

    return c.text('Unauthorized', 401);
  };
};
