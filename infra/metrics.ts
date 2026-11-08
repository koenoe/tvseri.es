/// <reference path="../.sst/platform/config.d.ts" />

import * as dynamo from './dynamo';

/**
 * Dead Letter Queue for metrics that fail after all retries.
 */
export const metricsDlq = new sst.aws.Queue('MetricsDLQ');

export const metricsQueue = new sst.aws.Queue('MetricsQueue', {
  dlq: {
    queue: metricsDlq.arn,
    retry: 3, // Move to DLQ after 3 failed processing attempts
  },
  // AWS recommends >= 6x the function timeout plus the batching window
  // (6 x 30s + 300s), so a message never becomes visible again mid-processing.
  visibilityTimeout: '480 seconds',
});

metricsQueue.subscribe(
  {
    handler: 'apps/api/src/lambdas/metrics.handler',
    link: [dynamo.metricsRaw],
    memory: '256 MB',
    timeout: '30 seconds',
  },
  {
    batch: {
      partialResponses: true, // Enable partial batch failure reporting
      size: 500, // Max batch size - fewer Lambda invocations
      // Max allowed: metrics are fire-and-forget, so fuller batches (fewer
      // invocations) beat lower latency. Keep visibilityTimeout in sync.
      window: '300 seconds',
    },
  },
);

/**
 * Daily Web Vitals aggregation cron job.
 * Runs at 00:05 UTC to aggregate the previous day's Web Vitals data.
 */
export const webVitalsAggregateCron = new sst.aws.Cron(
  'WebVitalsAggregateCron',
  {
    function: {
      handler: 'apps/api/src/lambdas/metricsAggregateWebVitals.handler',
      link: [dynamo.metricsRaw, dynamo.metricsWebVitals],
      memory: '512 MB',
      timeout: '5 minutes',
    },
    schedule: 'cron(5 0 * * ? *)', // Daily at 00:05 UTC
  },
);

/**
 * Daily API metrics aggregation cron job.
 * Runs at 00:10 UTC to aggregate the previous day's API metrics data.
 */
export const apiMetricsAggregateCron = new sst.aws.Cron(
  'ApiMetricsAggregateCron',
  {
    function: {
      handler: 'apps/api/src/lambdas/metricsAggregateApi.handler',
      link: [dynamo.metricsRaw, dynamo.metricsApi],
      memory: '512 MB',
      timeout: '5 minutes',
    },
    schedule: 'cron(10 0 * * ? *)', // Daily at 00:10 UTC
  },
);
