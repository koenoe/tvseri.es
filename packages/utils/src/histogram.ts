/**
 * Fixed-edge histograms: summing bins merges periods, so percentiles over
 * several days stay accurate where averaging daily percentiles would not.
 */

/** Sums histograms bin by bin; a shorter one counts as zeros at the end */
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

/** The bin a value falls in; anything past the last edge is in the last bin */
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
 * A percentile (0–100) from histogram bins, interpolated linearly within its
 * bin, in the units of `edges`.
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

      // An open-ended bin has no width to interpolate over
      if (!Number.isFinite(binEnd)) {
        return binStart;
      }

      const fractionInBin = (targetCount - prevCumulative) / binCount;
      return binStart + fractionInBin * (binEnd - binStart);
    }
  }

  return edges[edges.length - 2] ?? 0;
};
