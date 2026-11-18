import { API_METRICS_SAMPLE_RATE } from '@tvseri.es/constants';
import type { ApiMetricRecord } from '@tvseri.es/schemas';
import type { MiddlewareHandler } from 'hono';
import { Resource } from 'sst';

import { getMetricsStore, runWithMetrics } from '@/lib/metrics';
import { sendMessage } from '@/lib/sqs';
import type { Variables } from './auth';

/** Fire-and-forget: an error is logged and never affects the response */
const sendMetric = (record: ApiMetricRecord): void => {
  sendMessage(Resource.MetricsQueue.url, record).catch((error) => {
    console.error('[metrics] Failed to send metric to SQS:', error);
  });
};

// Webhook/scrobble tokens are long-lived credentials: never store them
const REDACTED = '[redacted]';
const WEBHOOK_TOKEN_PATH = /^\/webhook\/token\/[^/]+/;

export const redactPath = (path: string) =>
  path.replace(WEBHOOK_TOKEN_PATH, `/webhook/token/${REDACTED}`);

const redactQuery = (query: Record<string, string>) =>
  'token' in query ? { ...query, token: REDACTED } : query;

// Hono's routePath keeps param constraints (`/series/:id{[0-9]+}`); the
// dashboard groups by route, so record the plain pattern (`/series/:id`)
const PARAM_CONSTRAINT = /\{[^}]*\}/g;

const toRouteLabel = (routePath: string) =>
  routePath.replace(PARAM_CONSTRAINT, '');

/**
 * Records a sample of requests (API_METRICS_SAMPLE_RATE, to keep SQS
 * costs down) on the metrics queue: latency, status, client platform and
 * country, and every dependency call (TMDB, MDBList, DynamoDB...).
 *
 * When a handler throws, Hono runs app.onError and sets its response on
 * `c.res` before control returns here, so `c.res.status` is the status the
 * client actually got (e.g. 409/503 mapped by onError, 504 from timeout()).
 */
export const metrics = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const shouldSample = Math.random() < API_METRICS_SAMPLE_RATE;
    if (!shouldSample) {
      await next();
      return;
    }

    const start = performance.now();

    // The context collects the dependency calls the request makes
    const store = await runWithMetrics(async () => {
      await next();
      // Read while still inside the context: it's gone after
      return getMetricsStore();
    });

    const latency = Math.round(performance.now() - start);
    const timestamp = new Date().toISOString();
    const requestId = c.get('requestId') ?? crypto.randomUUID();

    const userAgent = c.req.header('user-agent') ?? null;
    const platform = c.req.header('x-client-platform') ?? 'web';
    const clientVersion = c.req.header('x-client-version') ?? null;

    const country = c.req.header('cloudfront-viewer-country') ?? 'unknown';

    const authenticated = !!c.get('auth')?.user;

    const queryParams = c.req.query();
    const query =
      Object.keys(queryParams).length > 0 ? redactQuery(queryParams) : null;

    // 0 when the response has no length (an error, a stream)
    const contentLength = c.res.headers.get('content-length');
    const responseSize = contentLength ? parseInt(contentLength, 10) : 0;

    // Already the onError response when the request failed (see above)
    const statusCode = c.res.status;

    const record: ApiMetricRecord = {
      authenticated,
      client: {
        platform,
        userAgent,
        version: clientVersion,
      },
      country,
      dependencies: store?.dependencies ?? [],
      latency,
      method: c.req.method,
      path: redactPath(c.req.path),
      query,
      requestId,
      responseSize,
      route: toRouteLabel(c.req.routePath),
      statusCode,
      timestamp,
      type: 'api',
    };

    sendMetric(record);
  };
};
