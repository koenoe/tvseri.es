import type { ScheduledHandler } from 'aws-lambda';

import { apiAggregation } from '@/lib/metrics/apiAggregation';
import { webVitalsAggregation } from '@/lib/metrics/webVitalsAggregation';

const aggregations: Readonly<Record<string, ScheduledHandler>> = {
  api: apiAggregation,
  'web-vitals': webVitalsAggregation,
};

/**
 * The daily metrics aggregation Lambda. Each schedule in infra/metrics.ts
 * passes the aggregation to run: `{ "aggregation": "api" }` or
 * `{ "aggregation": "web-vitals" }` (plus an optional `date` for manual runs).
 */
export const handler: ScheduledHandler = (event, context, callback) => {
  const name: unknown =
    event && typeof event === 'object' && 'aggregation' in event
      ? event.aggregation
      : undefined;
  const aggregation =
    typeof name === 'string' && Object.hasOwn(aggregations, name)
      ? aggregations[name]
      : undefined;

  if (!aggregation) {
    throw new Error(`Unknown metrics aggregation: ${String(name)}`);
  }

  return aggregation(event, context, callback);
};
