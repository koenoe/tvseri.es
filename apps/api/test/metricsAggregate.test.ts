import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handler } from '@/lambdas/metricsAggregate';

import { db } from './db';

/**
 * The daily aggregation crons: one day's raw metrics (every shard) become
 * aggregates, with sampled counts scaled back up by the sample rate (API 10%,
 * Web Vitals 25%).
 */

const DAY = '2026-11-16';
const client = { platform: 'web', userAgent: null, version: null };

const webVital = {
  client,
  country: 'GB',
  delta: 1,
  device: { type: 'desktop' },
  id: 'v1',
  name: 'LCP',
  navigationType: 'navigate',
  path: '/',
  pk: `WEB#${DAY}#2`,
  rating: 'good',
  route: '/',
  sk: `${DAY}T10:00:00.000Z#v1`,
  timestamp: `${DAY}T10:00:00.000Z`,
  type: 'web-vital',
  value: 1200,
};

const run = (aggregation: unknown) => handler({ aggregation, date: DAY });

const summary = (table: string) =>
  db.dump(table).find((item) => item.pk === DAY && item.sk === 'SUMMARY');

beforeEach(() => {
  // The crons read raw metrics with their own, uninstrumented client
  vi.spyOn(DynamoDBClient.prototype, 'send').mockImplementation(((
    command: Parameters<typeof db.send>[0],
  ) => db.send(command)) as never);
});

describe('daily metrics aggregation', () => {
  it('scales API counts by 10 and reads every shard', async () => {
    db.seed(
      'MetricsRaw',
      [0, 3, 9].map((shard, index) => ({
        authenticated: false,
        client,
        country: 'GB',
        dependencies: [],
        latency: 100,
        method: 'GET',
        path: '/genres',
        pk: `API#${DAY}#${shard}`,
        query: null,
        requestId: `r${index}`,
        responseSize: 10,
        route: '/genres',
        sk: `${DAY}T10:00:0${index}.000Z#r${index}`,
        statusCode: 200,
        timestamp: `${DAY}T10:00:0${index}.000Z`,
        type: 'api',
      })),
    );

    await run('api');

    expect(summary('MetricsApiAggregated')).toMatchObject({
      requestCount: 30,
    });
  });

  it('scales Web Vitals page views by 4', async () => {
    db.seed('MetricsRaw', [webVital]);

    await run('web-vitals');

    expect(summary('MetricsWebVitalsAggregated')).toMatchObject({
      pageviews: 4,
    });
  });

  it('runs only the aggregation its schedule names', async () => {
    db.seed('MetricsRaw', [webVital]);

    await run('api');

    expect(summary('MetricsWebVitalsAggregated')).toBeUndefined();
  });

  it.each([undefined, 'unknown', 'toString'])(
    'rejects an unknown aggregation (%s)',
    async (aggregation) => {
      await expect(run(aggregation)).rejects.toThrow(
        'Unknown metrics aggregation',
      );
    },
  );
});
