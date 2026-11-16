import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchRawMetrics, RAW_SHARD_COUNT } from '@/lib/metrics/rawShards';
import { metricsDynamo } from '@/routes/metrics/reads';
import {
  aggregateBreakdown,
  queryRouteTimeSeries,
  sortBreakdown,
} from '@/routes/metrics/web-vitals/queries';

import { FakeDynamo } from './fakeDynamo';

/**
 * The metrics reads use their own (uninstrumented) DynamoDB client: here it
 * answers from a double of the metrics tables
 */
const metrics = new FakeDynamo({
  MetricsRaw: { hashKey: 'pk', rangeKey: 'sk' },
  MetricsWebVitalsAggregated: {
    globalIndexes: {
      RouteTimeIndex: { hashKey: 'GSI1PK', rangeKey: 'GSI1SK' },
    },
    hashKey: 'pk',
    rangeKey: 'sk',
  },
});

const vital = (p75: number) => ({
  count: 10,
  histogram: [],
  p50: p75,
  p75,
  p90: p75,
  p95: p75,
  p99: p75,
  ratings: { good: 10, needsImprovement: 0, poor: 0 },
});

const aggregate = (pk: string, sk: string, extra: Record<string, unknown>) => ({
  CLS: vital(0.1),
  date: pk.slice(0, 10),
  FCP: vital(1000),
  INP: vital(100),
  LCP: vital(2000),
  pageviews: 10,
  pk,
  score: 90,
  sk,
  TTFB: vital(200),
  ...extra,
});

beforeEach(() => {
  metrics.reset();
  vi.spyOn(DynamoDBClient.prototype, 'send').mockImplementation(((
    command: never,
  ) => metrics.send(command)) as never);
});

describe('metrics reads', () => {
  it('reads a day of raw metrics from every shard', async () => {
    metrics.seed(
      'MetricsRaw',
      Array.from({ length: RAW_SHARD_COUNT }, (_, shard) => ({
        pk: `WEB#2026-11-14#${shard}`,
        sk: `2026-11-14T10:00:0${shard % 10}Z`,
      })),
    );

    const items = await fetchRawMetrics(
      metricsDynamo,
      'WEB#2026-11-14',
      '2026-11-14T00:00:00Z',
      '2026-11-14T23:59:59Z',
    );

    expect(items).toHaveLength(RAW_SHARD_COUNT);
    expect(metrics.calls).toHaveLength(RAW_SHARD_COUNT);
  });

  it('reads a route’s days between two dates on its time index', async () => {
    metrics.seed('MetricsWebVitalsAggregated', [
      {
        ...aggregate('2026-11-12', 'R#/a', {}),
        GSI1PK: 'R#/a',
        GSI1SK: '2026-11-12',
      },
      {
        ...aggregate('2026-11-13', 'R#/a', {}),
        GSI1PK: 'R#/a',
        GSI1SK: '2026-11-13',
      },
      {
        ...aggregate('2026-11-01', 'R#/a', {}),
        GSI1PK: 'R#/a',
        GSI1SK: '2026-11-01',
      },
    ]);

    const items = await queryRouteTimeSeries('/a', '2026-11-10', '2026-11-14');

    expect(items.map((item) => item.date).sort()).toEqual([
      '2026-11-12',
      '2026-11-13',
    ]);
  });

  it('aggregates each breakdown across the days and sorts by a vital', async () => {
    metrics.seed('MetricsWebVitalsAggregated', [
      aggregate('2026-11-13', 'R#/fast', { LCP: vital(1000) }),
      aggregate('2026-11-14', 'R#/fast', { LCP: vital(1000) }),
      aggregate('2026-11-14', 'R#/slow', { LCP: vital(4000) }),
      aggregate('2026-11-14', 'C#GB', {}),
    ]);

    const rows = (
      await aggregateBreakdown(['2026-11-14', '2026-11-13'], 'R#')
    ).map(([route, row]) => ({ ...row, route }));

    expect(
      sortBreakdown(rows, 'pageviews', 'desc').map((row) => [
        row.route,
        row.pageviews,
      ]),
    ).toEqual([
      ['/fast', 20],
      ['/slow', 10],
    ]);
    expect(sortBreakdown(rows, 'LCP', 'desc').map((row) => row.route)).toEqual([
      '/slow',
      '/fast',
    ]);
    expect(sortBreakdown(rows, 'LCP', 'asc').map((row) => row.route)).toEqual([
      '/fast',
      '/slow',
    ]);
  });
});
