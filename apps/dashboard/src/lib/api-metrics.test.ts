import { describe, expect, it } from 'vitest';

import { formatDependencies, toSeriesValues } from './api-metrics';

const series = (values: ReadonlyArray<number>) =>
  values.map((value, index) => ({ timestamp: `2026-11-0${index + 1}`, value }));

describe('toSeriesValues', () => {
  it('needs at least two points to draw a trend', () => {
    expect(toSeriesValues(undefined)).toBeUndefined();
    expect(toSeriesValues(series([5]))).toBeUndefined();
    expect(toSeriesValues(series([5, 7]))).toEqual([5, 7]);
  });
});

describe('formatDependencies', () => {
  it('keeps latency, error rate and request series apart', () => {
    const [item] = formatDependencies({
      tmdb: {
        count: 10,
        errorCount: 1,
        errorRate: 10,
        errorRateHistory: series([1, 2]),
        history: series([100, 200]),
        p75: 1,
        p90: 1,
        p95: 1,
        p99: 1,
        requestsHistory: series([4, 6]),
        throughput: 1,
      },
    });
    expect(toSeriesValues(item?.latencyHistory)).toEqual([100, 200]);
    expect(toSeriesValues(item?.errorRateHistory)).toEqual([1, 2]);
    expect(toSeriesValues(item?.requestsHistory)).toEqual([4, 6]);
  });
});
