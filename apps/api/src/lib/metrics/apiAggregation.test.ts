import type { ApiMetricRecord } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  aggregateDependencyOperationsWithSeries,
  aggregateSummaries,
} from '@/routes/metrics/api/queries';

import { aggregateApiMetrics } from './apiAggregation';

const record = (
  index: number,
  dependencyStatus: number,
  statusCode = 200,
): ApiMetricRecord => ({
  authenticated: false,
  client: { platform: 'web', userAgent: null, version: null },
  country: 'GB',
  dependencies: [
    {
      duration: 20,
      endpoint: 'GetItem',
      params: null,
      source: 'dynamodb',
      status: dependencyStatus,
      timestamp: '2026-11-17T10:00:00.000Z',
    },
  ],
  latency: 100,
  method: 'GET',
  path: '/series/1',
  query: null,
  requestId: `request-${index}`,
  responseSize: 100,
  route: '/series/:id',
  statusCode,
  timestamp: '2026-11-17T10:00:00.000Z',
  type: 'api',
});

// 10 sampled calls, 2 of them failed: a 20% error rate at any sample rate
const RECORDS = Array.from({ length: 10 }, (_, index) =>
  record(index, index < 2 ? 500 : 200),
);

const summaryOf = (date: string) => {
  const summary = aggregateApiMetrics(RECORDS, date).find(
    (item) => item.pk === date && item.sk === 'SUMMARY',
  );
  if (!summary) {
    throw new Error('no SUMMARY item');
  }
  return summary;
};

describe('dependency error rates after sampling', () => {
  it('a day’s dependency and its operations have the sampled error rate', () => {
    const dependency = summaryOf('2026-11-17').dependencies?.dynamodb;
    expect(dependency?.errorRate).toBe(20);
    const operation = dependency?.topOperations?.[0];
    expect(operation?.errorRate).toBe(20);
    // the counts are scaled up like the dependency's own
    expect(operation?.count).toBe(dependency?.count);
    expect(operation?.errorCount).toBe(dependency?.errorCount);
  });

  it('keeps the rate when days are merged, with a daily series', () => {
    const days = [summaryOf('2026-11-16'), summaryOf('2026-11-17')];
    const dependency = aggregateSummaries(days)?.dependencies?.dynamodb;
    expect(dependency?.errorRate).toBe(20);
    expect(dependency?.errorRateHistory?.map((day) => day.value)).toEqual([
      20, 20,
    ]);
    expect(dependency?.topOperations?.[0]?.errorRate).toBe(20);

    const [operation] = aggregateDependencyOperationsWithSeries(
      days,
      'dynamodb',
    );
    expect(operation?.errorRate).toBe(20);
    expect(operation?.series.map((day) => day.errorRate)).toEqual([20, 20]);
  });
});
