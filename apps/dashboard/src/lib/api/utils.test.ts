import type { CountryMetrics, RouteMetrics } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { groupCountriesByStatus, groupRoutesByStatus } from './utils';

const stats = (p75: number) => ({
  count: 1,
  p75,
  p90: p75,
  p95: p75,
  p99: p75,
  ratings: { good: 1, needsImprovement: 0, poor: 0 },
});

function row(lcpMs: number, pageviews: number) {
  return {
    CLS: stats(0.05),
    FCP: stats(900),
    INP: stats(120),
    LCP: stats(lcpMs),
    pageviews,
    score: 93.4,
    TTFB: stats(300),
  };
}

describe('groupRoutesByStatus', () => {
  it('buckets by threshold and sorts each bucket by page views', () => {
    const routes = [
      { ...row(1200, 5), route: '/a' },
      { ...row(3000, 50), route: '/b' },
      { ...row(2400, 40), route: '/c' },
      { ...row(9000, 1), route: '/d' },
    ] as unknown as ReadonlyArray<RouteMetrics>;

    expect(groupRoutesByStatus(routes, 'lcp')).toEqual({
      great: [
        { label: '/c', pageViews: 40, value: '2.40s' },
        { label: '/a', pageViews: 5, value: '1.20s' },
      ],
      needsImprovement: [{ label: '/b', pageViews: 50, value: '3.00s' }],
      poor: [{ label: '/d', pageViews: 1, value: '9.00s' }],
    });
  });

  it('formats ms, unitless and RES values', () => {
    const routes = [
      { ...row(1000, 1), route: '/a' },
    ] as unknown as ReadonlyArray<RouteMetrics>;

    expect(groupRoutesByStatus(routes, 'inp').great[0]?.value).toBe('120ms');
    expect(groupRoutesByStatus(routes, 'cls').great[0]?.value).toBe('0.05');
    expect(groupRoutesByStatus(routes, 'res').great[0]?.value).toBe(93.4);
  });
});

describe('groupCountriesByStatus', () => {
  it('keeps the country code as the id and shows its name', () => {
    const countries = [
      { ...row(1000, 3), country: 'GB' },
    ] as unknown as ReadonlyArray<CountryMetrics>;

    expect(groupCountriesByStatus(countries, 'lcp').great).toEqual([
      { id: 'GB', label: 'United Kingdom', pageViews: 3, value: '1.00s' },
    ]);
  });
});
