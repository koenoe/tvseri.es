/**
 * Utilities for processing metrics data
 */
import type {
  CountryMetrics,
  RouteMetrics,
  WebVitalMetricStats,
} from '@tvseri.es/schemas';

import { countryDisplayNames } from '@/lib/status-colors';
import {
  getMetricStatus,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
} from '@/lib/web-vitals';

type MetricItemWithRaw = {
  label: string;
  pageViews: number;
  rawValue: number;
  value: number | string;
};

export type MetricItem = Readonly<{
  label: string;
  pageViews: number;
  value: number | string;
}>;

export type GroupedMetricData = Readonly<{
  great: ReadonlyArray<MetricItem>;
  needsImprovement: ReadonlyArray<MetricItem>;
  poor: ReadonlyArray<MetricItem>;
}>;

/**
 * Get the display value for a metric.
 * For RES, show the score. For others, show p75 with unit.
 * API returns milliseconds, so we convert to seconds when needed.
 */
function getMetricDisplayValue(
  metric: MetricType,
  data: {
    CLS: WebVitalMetricStats;
    FCP: WebVitalMetricStats;
    INP: WebVitalMetricStats;
    LCP: WebVitalMetricStats;
    score: number;
    TTFB: WebVitalMetricStats;
  },
): number | string {
  if (metric === 'res') {
    return data.score;
  }

  const metricKey = metric.toUpperCase() as
    | 'CLS'
    | 'FCP'
    | 'INP'
    | 'LCP'
    | 'TTFB';
  const p75 = data[metricKey].p75;
  const unit = METRICS_CONFIG[metric].unit;

  if (unit === 's') {
    return `${(p75 / 1000).toFixed(2)}s`;
  }
  if (unit === 'ms') {
    return `${Math.round(p75)}ms`;
  }
  // CLS: unitless, show 2 decimal places
  return p75.toFixed(2);
}

/**
 * Get the raw value used for determining status.
 * For RES, use score. For others, use p75.
 * Converts milliseconds to seconds for metrics with 's' unit to match thresholds.
 */
function getMetricRawValue(
  metric: MetricType,
  data: {
    CLS: WebVitalMetricStats;
    FCP: WebVitalMetricStats;
    INP: WebVitalMetricStats;
    LCP: WebVitalMetricStats;
    score: number;
    TTFB: WebVitalMetricStats;
  },
): number {
  if (metric === 'res') {
    return data.score;
  }

  const metricKey = metric.toUpperCase() as
    | 'CLS'
    | 'FCP'
    | 'INP'
    | 'LCP'
    | 'TTFB';
  const p75 = data[metricKey].p75;
  const unit = METRICS_CONFIG[metric].unit;

  // Convert ms to seconds for metrics with 's' unit to match thresholds
  if (unit === 's') {
    return p75 / 1000;
  }
  return p75;
}

/**
 * Sort items by pageview count (highest first) within each group.
 */
function sortItemsByPageViews(
  items: Array<MetricItemWithRaw>,
): Array<MetricItem> {
  const sorted = [...items].sort((a, b) => b.pageViews - a.pageViews);

  // Remove rawValue from result
  return sorted.map(({ label, pageViews, value }) => ({
    label,
    pageViews,
    value,
  }));
}

/**
 * Group routes by their status for a given metric.
 * Items within each group are sorted by pageview count.
 */
export function groupRoutesByStatus(
  routes: ReadonlyArray<RouteMetrics>,
  metric: MetricType,
): GroupedMetricData {
  const groups: Record<RatingStatus, Array<MetricItemWithRaw>> = {
    great: [],
    needsImprovement: [],
    poor: [],
  };

  for (const route of routes) {
    const rawValue = getMetricRawValue(metric, route);
    const status = getMetricStatus(metric, rawValue);
    const displayValue = getMetricDisplayValue(metric, route);

    groups[status].push({
      label: route.route,
      pageViews: route.pageviews,
      rawValue,
      value: displayValue,
    });
  }

  return {
    great: sortItemsByPageViews(groups.great),
    needsImprovement: sortItemsByPageViews(groups.needsImprovement),
    poor: sortItemsByPageViews(groups.poor),
  };
}

/**
 * Group countries by their status for a given metric.
 * Items within each group are sorted by pageview count.
 */
export function groupCountriesByStatus(
  countries: ReadonlyArray<CountryMetrics>,
  metric: MetricType,
): GroupedMetricData {
  const groups: Record<RatingStatus, Array<MetricItemWithRaw>> = {
    great: [],
    needsImprovement: [],
    poor: [],
  };

  for (const country of countries) {
    const rawValue = getMetricRawValue(metric, country);
    const status = getMetricStatus(metric, rawValue);
    const displayValue = getMetricDisplayValue(metric, country);
    const countryName =
      countryDisplayNames.of(country.country) ?? country.country;

    groups[status].push({
      label: countryName,
      pageViews: country.pageviews,
      rawValue,
      value: displayValue,
    });
  }

  return {
    great: sortItemsByPageViews(groups.great),
    needsImprovement: sortItemsByPageViews(groups.needsImprovement),
    poor: sortItemsByPageViews(groups.poor),
  };
}
