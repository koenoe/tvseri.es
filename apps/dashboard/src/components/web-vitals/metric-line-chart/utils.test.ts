import type { MetricSeriesItem } from '@tvseri.es/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChartDataPoint, PercentileKey } from './constants';
import {
  buildChartData,
  getGridLines,
  getLastDataIndex,
  getTickConfig,
  getYAxisMax,
  getYAxisTicks,
} from './utils';

const point = (p75?: number, p99?: number): ChartDataPoint => ({
  date: 'd',
  formattedDate: 'd',
  p75,
  p99,
  pageviews: 1,
});
const only = (...keys: PercentileKey[]) => new Set(keys);

describe('getYAxisMax', () => {
  it('pins RES to 100', () => {
    expect(getYAxisMax([point(40)], only('p75'), 'res')).toBe(100);
  });

  it('keeps a third of headroom above the poor threshold', () => {
    // LCP poor is 4s: 4 * 1.33 = 5.32, rounded up to the next half.
    expect(getYAxisMax([point(1)], only('p75'), 'lcp')).toBe(5.5);
  });

  it('follows the highest visible percentile only', () => {
    const data = [point(2, 9)];
    expect(getYAxisMax(data, only('p75'), 'lcp')).toBe(5.5);
    // 9 * 1.15 = 10.35 → 10.5
    expect(getYAxisMax(data, only('p75', 'p99'), 'lcp')).toBe(10.5);
  });

  it('rounds by magnitude', () => {
    // INP poor is 500ms: 665 → 670; 2000 * 1.15 = 2300.
    expect(getYAxisMax([point(100)], only('p75'), 'inp')).toBe(670);
    expect(getYAxisMax([point(2000)], only('p75'), 'inp')).toBe(2300);
    // CLS poor is 0.25: 0.3325 → 0.35
    expect(getYAxisMax([point(0.01)], only('p75'), 'cls')).toBe(0.35);
  });
});

describe('ticks and grid lines', () => {
  it('puts ticks on 0, both thresholds and the top, with grid lines between', () => {
    const ticks = getYAxisTicks('lcp', 5.5);
    expect(ticks).toEqual([0, 2.5, 4, 5.5]);
    expect(getGridLines(ticks)).toEqual([1.25, 3.25, 4.75]);
  });

  it('marks the thresholds of RES like the other metrics', () => {
    expect(getTickConfig(90, 'res').indicator).toBe('dot');
    expect(getTickConfig(50, 'res').indicator).toBe('triangle');
    expect(getTickConfig(100, 'res').indicator).toBeNull();
  });
});

describe('buildChartData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 10, 9));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has one point per day up to yesterday, valueless where data is missing', () => {
    const stats = { count: 1, p75: 2000, p90: 3000, p95: 4000, p99: 5000 };
    const item = {
      CLS: stats,
      date: '2026-01-08',
      FCP: stats,
      INP: stats,
      LCP: stats,
      pageviews: 7,
      score: 90,
      TTFB: stats,
    } as unknown as MetricSeriesItem;

    const data = buildChartData([item], 3, 'lcp');

    expect(data.map((p) => p.date)).toEqual([
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
    ]);
    expect(data[0]?.p75).toBeUndefined();
    expect(data[0]?.pageviews).toBe(0);
    expect(data[1]).toMatchObject({ p75: 2, p99: 5, pageviews: 7 });
    expect(getLastDataIndex(data)).toBe(1);
  });
});

describe('chart dates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 9));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('read day first, as in "17 Nov"', () => {
    const [yesterday] = buildChartData([], 1, 'lcp');
    expect(yesterday?.formattedDate).toBe('17 Nov');
  });
});
