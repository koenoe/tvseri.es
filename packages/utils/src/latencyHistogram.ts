/**
 * API latency histogram utilities for accurate percentile calculation
 * when aggregating data across multiple time periods.
 *
 * Uses fixed bin edges to enable merging histograms by summing counts.
 * All values are in milliseconds.
 */

import {
  findBinIndexForEdges,
  mergeHistogramBins,
  percentileFromBins,
} from './histogram';

/**
 * Histogram bin edges for API latency in milliseconds.
 * Provides good granularity for typical API response times.
 */
export const LATENCY_HISTOGRAM_EDGES: readonly number[] = [
  0,
  10,
  25,
  50,
  75,
  100,
  150,
  200,
  300,
  500,
  750,
  1000,
  1500,
  2000,
  3000,
  5000,
  Infinity,
] as const;

/**
 * Find which bin a latency value belongs to.
 */
export const findLatencyBinIndex = (latencyMs: number): number =>
  findBinIndexForEdges(latencyMs, LATENCY_HISTOGRAM_EDGES);

/**
 * Build histogram bins from an array of latency values (in ms).
 */
export const buildLatencyHistogramBins = (latencies: number[]): number[] => {
  const bins = new Array(LATENCY_HISTOGRAM_EDGES.length - 1).fill(
    0,
  ) as number[];

  for (const latency of latencies) {
    const index = findLatencyBinIndex(latency);
    const currentValue = bins[index] ?? 0;
    bins[index] = currentValue + 1;
  }

  return bins;
};

/**
 * Merge multiple latency histograms by summing corresponding bins.
 * @deprecated Use mergeHistogramBins from './histogram' directly
 */
export const mergeLatencyHistograms = mergeHistogramBins;

/**
 * Calculate a percentile from latency histogram bins using linear interpolation.
 *
 * @param bins - Count of values in each bin
 * @param percentile - Target percentile (0-100)
 * @returns Percentile value in milliseconds
 */
export const percentileFromLatencyHistogram = (
  bins: number[],
  percentile: number,
): number => percentileFromBins(bins, LATENCY_HISTOGRAM_EDGES, percentile);
