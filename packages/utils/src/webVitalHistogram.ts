/** Web Vitals histograms, fixed edges per metric so bins merge by summing */

import {
  findBinIndexForEdges,
  mergeHistogramBins,
  percentileFromBins,
} from './histogram';

export type WebVitalMetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

/**
 * Bin edges in display units: ms for INP, s for LCP/FCP/TTFB, unitless for
 * CLS. They include web.dev's "good" and "needs improvement" thresholds and
 * are finest around them.
 */
const HISTOGRAM_EDGES: Readonly<Record<WebVitalMetricName, readonly number[]>> =
  {
    CLS: [0, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5, Infinity],
    FCP: [0, 0.5, 1.0, 1.5, 1.8, 2.2, 2.6, 3.0, 4.0, 5.0, Infinity],
    INP: [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000, Infinity],
    LCP: [0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 8.0, Infinity],
    TTFB: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.8, 2.5, 4.0, Infinity],
  } as const;

/** web-vitals reports LCP/FCP/TTFB in ms; their bins are in seconds */
const toHistogramUnits = (
  value: number,
  metric: WebVitalMetricName,
): number => {
  if (metric === 'INP' || metric === 'CLS') return value;
  return value / 1000;
};

const fromHistogramUnits = (
  value: number,
  metric: WebVitalMetricName,
): number => {
  if (metric === 'INP' || metric === 'CLS') return value;
  return value * 1000;
};

const findBinIndex = (value: number, edges: readonly number[]): number =>
  findBinIndexForEdges(value, edges);

/** Bins for raw web-vitals values (ms for the timings) */
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

/** @deprecated Use `mergeHistogramBins` */
export const mergeHistograms = mergeHistogramBins;

/** A percentile (0–100) of a metric's bins, in raw units (ms for timings) */
export const percentileFromHistogram = (
  bins: number[],
  metric: WebVitalMetricName,
  percentile: number,
): number => {
  const edges = HISTOGRAM_EDGES[metric];
  const valueInHistogramUnits = percentileFromBins(bins, edges, percentile);
  return fromHistogramUnits(valueInHistogramUnits, metric);
};
