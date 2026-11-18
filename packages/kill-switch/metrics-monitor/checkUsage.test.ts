import type { DistributionSummary } from '@aws-sdk/client-cloudfront';
import { describe, expect, it, vi } from 'vitest';

import { checkUsage, type UsageDeps } from './checkUsage';

const distribution = (
  id: string,
  functions: ReadonlyArray<string>,
): DistributionSummary =>
  ({
    CacheBehaviors: {
      Items: [
        {
          FunctionAssociations: {
            Items: functions.map((name) => ({
              EventType: 'viewer-request',
              FunctionARN: `arn:aws:cloudfront::1:function/${name}`,
            })),
            Quantity: functions.length,
          },
        },
      ],
      Quantity: 1,
    },
    DefaultCacheBehavior: {
      FunctionAssociations: {
        Items: functions.map((name) => ({
          EventType: 'viewer-request',
          FunctionARN: `arn:aws:cloudfront::1:function/${name}`,
        })),
        Quantity: functions.length,
      },
    },
    Id: id,
  }) as DistributionSummary;

const deps = (
  totals: Readonly<Record<string, number>>,
  overrides: Partial<UsageDeps> = {},
): UsageDeps => ({
  getMetricPage: async () => ({
    MetricDataResults: Object.entries(totals).map(([Label, value]) => ({
      Label,
      Values: [value],
    })),
  }),
  listDistributions: async () => [
    distribution('API', ['ApiRouterFn']),
    distribution('AUTH', ['ApiRouterFn', 'AuthFn']),
  ],
  now: new Date('2026-11-14T10:00:00Z'),
  publish: vi.fn(async () => {}),
  ...overrides,
});

describe('checkUsage', () => {
  it('does nothing under the limits', async () => {
    const usage = deps({
      BytesDownloaded: 999_999_999_999,
      FunctionInvocations: 39_999_999,
      Requests: 39_999_999,
    });
    expect((await checkUsage(usage)).exceeded).toEqual([]);
    expect(usage.publish).not.toHaveBeenCalled();
  });

  // API requests and CloudFront Function invocations move together
  it.each(['Requests', 'FunctionInvocations'])(
    'alerts the kill switch once %s reach 40M',
    async (metric) => {
      const usage = deps({ [metric]: 40_000_000 });
      expect((await checkUsage(usage)).exceeded).toEqual([metric]);
      expect(usage.publish).toHaveBeenCalledTimes(1);
    },
  );

  it('alerts at 1 TB downloaded', async () => {
    const usage = deps({ BytesDownloaded: 1_000_000_000_000 });
    expect((await checkUsage(usage)).exceeded).toEqual(['BytesDownloaded']);
  });

  it('sums every distribution against the one limit', async () => {
    const usage = deps(
      {},
      {
        getMetricPage: async () => ({
          MetricDataResults: [
            { Label: 'Requests', Values: [15_000_000, 5_000_000] },
            { Label: 'Requests', Values: [20_000_000] },
          ],
        }),
      },
    );
    expect((await checkUsage(usage)).exceeded).toEqual(['Requests']);
    expect(usage.publish).toHaveBeenCalledTimes(1);
  });

  it('sends one alert naming every limit reached', async () => {
    const usage = deps({
      BytesDownloaded: 1_000_000_000_000,
      FunctionInvocations: 40_000_000,
      Requests: 40_000_000,
    });
    await checkUsage(usage);
    expect(usage.publish).toHaveBeenCalledTimes(1);
    const named = vi.mocked(usage.publish).mock.calls[0]?.[0] ?? [];
    expect([...named].sort()).toEqual([
      'BytesDownloaded',
      'FunctionInvocations',
      'Requests',
    ]);
  });

  it('asks for every distribution and each function once, over the month so far', async () => {
    const getMetricPage = vi.fn<UsageDeps['getMetricPage']>(async () => ({}));
    await checkUsage(deps({}, { getMetricPage }));

    const input = getMetricPage.mock.calls[0]?.[0];
    expect(input?.start).toEqual(new Date('2026-11-01T00:00:00Z'));
    expect(input?.end).toEqual(new Date('2026-12-01T00:00:00Z'));
    const dimensions = input?.queries.map((query) =>
      query.MetricStat?.Metric?.Dimensions?.map((d) => d.Value).join('/'),
    );
    expect(dimensions).toEqual([
      'API/Global',
      'API/Global',
      'AUTH/Global',
      'AUTH/Global',
      'ApiRouterFn/Global',
      'AuthFn/Global',
    ]);
  });

  it('fails, without alerting, when the metrics can’t be read', async () => {
    const usage = deps(
      {},
      {
        getMetricPage: async () => {
          throw new Error('Throttling');
        },
      },
    );
    await expect(checkUsage(usage)).rejects.toThrow('Throttling');
    expect(usage.publish).not.toHaveBeenCalled();
  });

  it('fails when the alert can’t be sent', async () => {
    const usage = deps(
      { Requests: 40_000_000 },
      {
        publish: async () => {
          throw new Error('SNS down');
        },
      },
    );
    await expect(checkUsage(usage)).rejects.toThrow('SNS down');
  });
});
