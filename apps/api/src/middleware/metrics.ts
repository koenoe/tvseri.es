import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { ApiMetricRecord } from '@tvseri.es/schemas';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';

import { getMetricsStore, runWithMetrics } from '@/lib/metrics';
import type { Variables } from './auth';

const sqs = new SQSClient({});

/**
 * Send a metric record to SQS for async processing.
 * Fire-and-forget - errors are logged but don't affect the response.
 */
const sendMetric = (record: ApiMetricRecord): void => {
  sqs
    .send(
      new SendMessageCommand({
        MessageBody: JSON.stringify(record),
        QueueUrl: Resource.MetricsQueue.url,
      }),
    )
    .catch((error) => {
      console.error('[metrics] Failed to send metric to SQS:', error);
    });
};

/**
 * Sampling rate for API metrics (0.0 to 1.0).
 * Set to 0.1 to record 10% of requests, reducing SQS costs by ~90%.
 */
const METRICS_SAMPLE_RATE = 0.1;

/**
 * Metrics middleware for collecting API performance data.
 *
 * Captures:
 * - Request latency
 * - Status codes (including errors via c.error)
 * - Cache status (from CloudFront header)
 * - Client context (platform, device, country)
 * - All dependency metrics (TMDB, MDBList, DynamoDB, etc.)
 *
 * Sends metrics to SQS for async batch processing to DynamoDB.
 * Only samples a percentage of requests to reduce SQS costs.
 *
 * Note: Uses Hono's c.error pattern to capture error status codes.
 * When an error occurs, Hono's error handler runs and populates c.error,
 * then control returns here so we can record the metric.
 */
export const metrics = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    // Skip metrics collection for non-sampled requests
    const shouldSample = Math.random() < METRICS_SAMPLE_RATE;
    if (!shouldSample) {
      await next();
      return;
    }

    const start = performance.now();

    // Run the request within a metrics context to collect dependencies
    const store = await runWithMetrics(async () => {
      await next();
      // Return store while still inside the context
      return getMetricsStore();
    });

    const latency = Math.round(performance.now() - start);
    const timestamp = new Date().toISOString();
    const requestId = c.get('requestId') ?? crypto.randomUUID();

    // Get client context from headers
    const userAgent = c.req.header('user-agent') ?? null;
    const platform = c.req.header('x-client-platform') ?? 'web';
    const clientVersion = c.req.header('x-client-version') ?? null;

    // Get country from CloudFront
    const country = c.req.header('cloudfront-viewer-country') ?? 'unknown';

    // Check if authenticated
    const authenticated = !!c.get('auth')?.user;

    // Get query params (if any)
    const queryEntries = Object.entries(c.req.query());
    const query =
      queryEntries.length > 0 ? Object.fromEntries(queryEntries) : null;

    // Get response size (may be 0 on errors)
    const contentLength = c.res.headers.get('content-length');
    const responseSize = contentLength ? parseInt(contentLength, 10) : 0;

    // Determine status code - check c.error for error cases
    let statusCode = c.res.status;
    if (c.error) {
      if (c.error instanceof HTTPException) {
        statusCode = c.error.status;
      } else if (c.error.name === 'TimeoutError') {
        statusCode = 504;
      } else {
        statusCode = 500;
      }
    }

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
      path: c.req.path,
      query,
      requestId,
      responseSize,
      route: c.req.routePath,
      statusCode,
      timestamp,
      type: 'api',
    };

    // Send to SQS (fire and forget - don't block response)
    sendMetric(record);
  };
};
