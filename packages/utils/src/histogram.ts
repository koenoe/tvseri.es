/**
 * Shared histogram utilities for accurate percentile calculation
 * when aggregating data across multiple time periods.
 */

/**
 * Merge multiple histograms by summing corresponding bins.
 * Works for any histogram type (web vitals, latency, etc.)
 */
export const mergeHistogramBins = (histograms: number[][]): number[] => {
  if (histograms.length === 0) return [];

  const maxLength = Math.max(...histograms.map((h) => h.length));
  const merged = new Array(maxLength).fill(0) as number[];

  for (const histogram of histograms) {
    for (let i = 0; i < histogram.length; i++) {
      const currentValue = merged[i] ?? 0;
      merged[i] = currentValue + (histogram[i] ?? 0);
    }
  }

  return merged;
};

/**
 * Find which bin a value belongs to given bin edges.
 */
export const findBinIndexForEdges = (
  value: number,
  edges: readonly number[],
): number => {
  for (let i = 0; i < edges.length - 1; i++) {
    if (value < (edges[i + 1] ?? Infinity)) return i;
  }
  return edges.length - 2;
};

/**
 * Calculate a percentile from histogram bins using linear interpolation.
 *
 * @param bins - Count of values in each bin
 * @param edges - Bin edge boundaries
 * @param percentile - Target percentile (0-100)
 * @returns Percentile value in the same units as edges
 */
export const percentileFromBins = (
  bins: number[],
  edges: readonly number[],
  percentile: number,
): number => {
  const totalCount = bins.reduce((sum, count) => sum + count, 0);

  if (totalCount === 0) return 0;

  const targetCount = (percentile / 100) * totalCount;
  let cumulativeCount = 0;

  for (let i = 0; i < bins.length; i++) {
    const binCount = bins[i] ?? 0;
    const prevCumulative = cumulativeCount;
    cumulativeCount += binCount;

    if (cumulativeCount >= targetCount && binCount > 0) {
      const binStart = edges[i] ?? 0;
      const binEnd = edges[i + 1] ?? binStart;

      // For infinity edge, return bin start as conservative estimate
      if (!Number.isFinite(binEnd)) {
        return binStart;
      }

      // Linear interpolation within the bin
      const fractionInBin = (targetCount - prevCumulative) / binCount;
      return binStart + fractionInBin * (binEnd - binStart);
    }
  }

  // Fallback: return start of last finite bin
  return edges[edges.length - 2] ?? 0;
};
