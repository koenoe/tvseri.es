/**
 * Web Vitals histogram utilities for accurate percentile calculation
 * when aggregating data across multiple time periods.
 *
 * Uses fixed bin edges per metric to enable merging histograms by summing counts.
 */

import {
  findBinIndexForEdges,
  mergeHistogramBins,
  percentileFromBins,
} from './histogram';

export type WebVitalMetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

/**
 * Histogram bin edges per metric.
 * Values are in display units: ms for INP, s for LCP/FCP/TTFB, unitless for CLS.
 *
 * These match the thresholds from web.dev and provide good granularity
 * around the "good" and "needs improvement" boundaries.
 */
export const HISTOGRAM_EDGES: Readonly<
  Record<WebVitalMetricName, readonly number[]>
> = {
  CLS: [0, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5, Infinity],
  FCP: [0, 0.5, 1.0, 1.5, 1.8, 2.2, 2.6, 3.0, 4.0, 5.0, Infinity],
  INP: [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000, Infinity],
  LCP: [0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 8.0, Infinity],
  TTFB: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.8, 2.5, 4.0, Infinity],
} as const;

/**
 * Convert raw metric value to histogram units.
 * Raw values from web-vitals library are in ms, but LCP/FCP/TTFB bins use seconds.
 */
export const toHistogramUnits = (
  value: number,
  metric: WebVitalMetricName,
): number => {
  // INP is in ms, CLS is unitless - use as-is
  if (metric === 'INP' || metric === 'CLS') return value;
  // LCP, FCP, TTFB: convert from ms to seconds
  return value / 1000;
};

/**
 * Convert histogram units back to raw metric units (ms).
 */
export const fromHistogramUnits = (
  value: number,
  metric: WebVitalMetricName,
): number => {
  if (metric === 'INP' || metric === 'CLS') return value;
  return value * 1000;
};

/**
 * Find which bin a value belongs to.
 */
export const findBinIndex = (value: number, edges: readonly number[]): number =>
  findBinIndexForEdges(value, edges);

/**
 * Build histogram bins from an array of raw values.
 */
export const buildHistogramBins = (
  values: number[],
  metric: WebVitalMetricName,
): number[] => {
  const edges = HISTOGRAM_EDGES[metric];
  const bins = new Array(edges.length - 1).fill(0) as number[];

  for (const value of values) {
    const normalized = toHistogramUnits(value, metric);
    const index = findBinIndex(normalized, edges);
    const currentValue = bins[index] ?? 0;
    bins[index] = currentValue + 1;
  }

  return bins;
};

/**
 * Merge multiple histograms by summing corresponding bins.
 * @deprecated Use mergeHistogramBins from './histogram' directly
 */
export const mergeHistograms = mergeHistogramBins;

/**
 * Calculate a percentile from histogram bins using linear interpolation.
 *
 * @param bins - Count of values in each bin
 * @param metric - Metric name (determines bin edges and unit conversion)
 * @param percentile - Target percentile (0-100)
 * @returns Percentile value in raw metric units (ms for time-based)
 */
export const percentileFromHistogram = (
  bins: number[],
  metric: WebVitalMetricName,
  percentile: number,
): number => {
  const edges = HISTOGRAM_EDGES[metric];
  const valueInHistogramUnits = percentileFromBins(bins, edges, percentile);
  return fromHistogramUnits(valueInHistogramUnits, metric);
};
