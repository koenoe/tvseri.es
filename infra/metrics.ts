/// <reference path="../.sst/platform/config.d.ts" />

import { alarmOnDeadLetters } from './alerts';
import * as dynamo from './dynamo';

/**
 * Dead Letter Queue for metrics that fail after all retries.
 */
const metricsDlq = new sst.aws.Queue('MetricsDLQ', {
  transform: {
    queue: {
      messageRetentionSeconds: 1_209_600, // 14 days (max), like the other DLQs
    },
  },
});
alarmOnDeadLetters('MetricsDLQ', metricsDlq);

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
 * Daily metrics aggregation: one Lambda, one schedule per aggregation, each
 * aggregating the previous day's raw metrics. Both kinds reach the raw table
 * through the queue above, whose batching window holds the day's last ones
 * for up to 300 s (more after a failed batch's visibility timeout), so the
 * runs start well after midnight.
 */
const metricsAggregate = new sst.aws.Function('MetricsAggregate', {
  handler: 'apps/api/src/lambdas/metricsAggregate.handler',
  link: [dynamo.metricsRaw, dynamo.metricsApi, dynamo.metricsWebVitals],
  memory: '512 MB',
  timeout: '5 minutes',
});

new sst.aws.Cron('WebVitalsAggregateCron', {
  event: { aggregation: 'web-vitals' },
  function: metricsAggregate,
  schedule: 'cron(20 0 * * ? *)', // Daily at 00:20 UTC
});

new sst.aws.Cron('ApiMetricsAggregateCron', {
  event: { aggregation: 'api' },
  function: metricsAggregate,
  schedule: 'cron(25 0 * * ? *)', // Daily at 00:25 UTC
});
