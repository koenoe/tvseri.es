/**
 * Utilities for processing metrics data
 */
import type {
  CountryMetrics,
  RouteMetrics,
  WebVitalMetricStats,
} from '@tvseri.es/schemas';

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
 * Format page views for display.
 * >= 1000 shows as 1k, 1.5k, etc.
 * < 1000 shows full number.
 */
export function formatPageViews(pageViews: number): string {
  if (pageViews < 1000) {
    return String(pageViews);
  }
  const thousands = pageViews / 1000;
  // Show decimal only if not a whole number (e.g., 1.5k but not 2.0k)
  const formatted =
    thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
  return `${formatted}k`;
}

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
 * Sort items from best to worst within each group.
 * For "lower is better" metrics (time-based), lower values are better.
 * For RES (higher is better), higher values are better.
 */
function sortItemsByPerformance(
  items: Array<MetricItemWithRaw>,
  lowerIsBetter: boolean,
): Array<MetricItem> {
  const sorted = [...items].sort((a, b) => {
    // Sort best to worst
    // For "lower is better": best = lowest, so sort ascending
    // For "higher is better": best = highest, so sort descending
    return lowerIsBetter ? a.rawValue - b.rawValue : b.rawValue - a.rawValue;
  });

  // Remove rawValue from result
  return sorted.map(({ label, pageViews, value }) => ({
    label,
    pageViews,
    value,
  }));
}

/**
 * Group routes by their status for a given metric.
 * Items within each group are sorted from best to worst.
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

  const lowerIsBetter = METRICS_CONFIG[metric].lowerIsBetter;

  return {
    great: sortItemsByPerformance(groups.great, lowerIsBetter),
    needsImprovement: sortItemsByPerformance(
      groups.needsImprovement,
      lowerIsBetter,
    ),
    poor: sortItemsByPerformance(groups.poor, lowerIsBetter),
  };
}

/**
 * Group countries by their status for a given metric.
 * Items within each group are sorted from best to worst.
 */
const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });

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

  const lowerIsBetter = METRICS_CONFIG[metric].lowerIsBetter;

  return {
    great: sortItemsByPerformance(groups.great, lowerIsBetter),
    needsImprovement: sortItemsByPerformance(
      groups.needsImprovement,
      lowerIsBetter,
    ),
    poor: sortItemsByPerformance(groups.poor, lowerIsBetter),
  };
}
