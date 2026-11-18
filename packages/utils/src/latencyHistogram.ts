/** API latency histograms (milliseconds), merged by summing bins */

import { findBinIndexForEdges, percentileFromBins } from './histogram';

const LATENCY_HISTOGRAM_EDGES: readonly number[] = [
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

const findLatencyBinIndex = (latencyMs: number): number =>
  findBinIndexForEdges(latencyMs, LATENCY_HISTOGRAM_EDGES);

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

/** A percentile (0–100) of the latency bins, in milliseconds */
export const percentileFromLatencyHistogram = (
  bins: number[],
  percentile: number,
): number => percentileFromBins(bins, LATENCY_HISTOGRAM_EDGES, percentile);
