/**
 * Real Experience Score (RES) calculation utilities.
 *
 * Implements Vercel's RES scoring methodology, which uses Lighthouse 10
 * log-normal scoring curves to convert raw Web Vitals values into 0-100 scores.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HOW LOG-NORMAL SCORING WORKS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Web performance data follows a log-normal distribution (most sites cluster
 * around "okay" performance, with a long tail of slow sites). Lighthouse uses
 * this distribution to map raw metric values to scores.
 *
 * Two control points define the curve for each metric:
 * - p10 (10th percentile) → maps to score 90 ("good" threshold)
 * - median (50th percentile) → maps to score 50
 *
 * The score formula uses the log-normal cumulative distribution function (CDF):
 *
 *   score = 100 × (1 - CDF(value))
 *
 * Where CDF is computed as:
 *
 *   z = (ln(value) - μ) / σ
 *   CDF = 0.5 × (1 + erf(z / √2))
 *
 * The parameters μ (mu) and σ (sigma) are derived from the control points:
 *   μ = ln(median)
 *   σ = (ln(median) - ln(p10)) / 1.2816
 *       where 1.2816 ≈ Φ⁻¹(0.9) (inverse normal CDF at 0.9)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERCEL RES CALCULATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Vercel's Real Experience Score is a weighted average of individual metric
 * scores, using the p75 value for each metric:
 *
 *   RES = (FCP_score × 0.15) + (LCP_score × 0.30) + (INP_score × 0.30) + (CLS_score × 0.25)
 *
 * Note: TTFB is NOT included in Vercel's RES calculation.
 *
 * The weights reflect Google's Core Web Vitals priorities:
 * - LCP (30%): Largest Contentful Paint - loading performance
 * - INP (30%): Interaction to Next Paint - interactivity
 * - CLS (25%): Cumulative Layout Shift - visual stability
 * - FCP (15%): First Contentful Paint - perceived load speed
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTROL POINTS (Lighthouse 10)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * These values come from HTTP Archive real-world data and define where
 * the scoring curve bends:
 *
 * | Metric | p10 (score=90) | median (score=50) | Units |
 * |--------|----------------|-------------------|-------|
 * | FCP    | 1800           | 3000              | ms    |
 * | LCP    | 2500           | 4000              | ms    |
 * | INP    | 200            | 500               | ms    |
 * | CLS    | 0.1            | 0.25              | n/a   |
 *
 * @see https://vercel.com/docs/speed-insights/metrics#real-experience-score-res
 * @see https://web.dev/performance-scoring/
 * @see https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/metrics/
 */

/**
 * Metric names included in Vercel's RES calculation.
 * Note: TTFB is intentionally excluded.
 */
export type RESMetricName = 'CLS' | 'FCP' | 'INP' | 'LCP';

/**
 * Lighthouse 10 scoring control points.
 *
 * - p10: Value at 10th percentile of real-world data → maps to score 90
 * - median: Value at 50th percentile → maps to score 50
 *
 * All time values are in milliseconds. CLS is unitless.
 */
const LIGHTHOUSE_CONTROL_POINTS: Readonly<
  Record<RESMetricName, { median: number; p10: number }>
> = {
  // CLS: unitless (0.1 = good threshold, 0.25 = poor threshold)
  CLS: { median: 0.25, p10: 0.1 },
  // FCP: milliseconds (1.8s = good, 3s = poor)
  FCP: { median: 3000, p10: 1800 },
  // INP: milliseconds (200ms = good, 500ms = poor)
  INP: { median: 500, p10: 200 },
  // LCP: milliseconds (2.5s = good, 4s = poor)
  LCP: { median: 4000, p10: 2500 },
} as const;

/**
 * Vercel's RES metric weights (must sum to 1.0).
 *
 * These weights are based on Lighthouse 10 scoring criteria and reflect
 * the relative importance of each metric for user experience.
 */
const RES_WEIGHTS: Readonly<Record<RESMetricName, number>> = {
  CLS: 0.25, // 25% - Visual stability
  FCP: 0.15, // 15% - Perceived load speed
  INP: 0.3, // 30% - Interactivity (replaced FID)
  LCP: 0.3, // 30% - Loading performance
} as const;

/**
 * Approximate error function (erf) using Horner's method.
 *
 * The error function is used in the log-normal CDF calculation.
 * This approximation has a maximum error of 1.5×10⁻⁷.
 *
 * @see Abramowitz and Stegun, Handbook of Mathematical Functions, formula 7.1.26
 */
const erf = (x: number): number => {
  // Constants for the approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save the sign of x
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  // Approximation formula
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
};

/**
 * Inverse of the standard normal CDF (probit function).
 *
 * Used to derive the sigma parameter from control points.
 * For p=0.9, this returns approximately 1.2816.
 */
const PROBIT_0_9 = 1.2815515655446004;

/**
 * Compute a 0-100 score for a single metric using log-normal scoring.
 *
 * The score represents how the given value compares to real-world performance:
 * - Score 100: Faster than nearly all websites
 * - Score 90: At the "good" threshold (p10 of real-world data)
 * - Score 50: At the median of real-world data
 * - Score 0: Slower than nearly all websites
 *
 * @param value - Raw metric value (ms for time metrics, unitless for CLS)
 * @param metric - Metric name (FCP, LCP, INP, CLS)
 * @returns Score from 0-100
 *
 * @example
 * computeMetricScore(2500, 'LCP') // → 90 (at the "good" threshold)
 * computeMetricScore(1200, 'LCP') // → ~99 (very fast)
 * computeMetricScore(6000, 'LCP') // → ~25 (slow)
 */
export const computeMetricScore = (
  value: number,
  metric: RESMetricName,
): number => {
  // Handle edge cases:
  // - Zero or negative values indicate missing data, return 0 (not 100)
  // - Non-finite values (NaN, Infinity) also return 0
  if (value <= 0 || !Number.isFinite(value)) return 0;

  const { median, p10 } = LIGHTHOUSE_CONTROL_POINTS[metric];

  // Derive log-normal parameters from control points:
  // μ = ln(median)  (at CDF = 0.5, the z-score is 0, so ln(value) = μ)
  // σ = (ln(median) - ln(p10)) / Φ⁻¹(0.9)
  //     where Φ⁻¹(0.9) ≈ 1.2816 is the inverse normal CDF at 0.9
  const mu = Math.log(median);
  const sigma = (Math.log(median) - Math.log(p10)) / PROBIT_0_9;

  // Compute log-normal CDF:
  // z = (ln(value) - μ) / σ
  // CDF = 0.5 × (1 + erf(z / √2))
  const z = (Math.log(value) - mu) / sigma;
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));

  // Score is 100 × (1 - CDF), clamped to [0, 100]
  const score = 100 * (1 - cdf);
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Compute Vercel's Real Experience Score (RES) from individual metric values.
 *
 * RES is a weighted average of log-normal scores for each Core Web Vital,
 * using p75 values to represent typical user experience.
 *
 * @param metrics - Object containing p75 values for each metric (in ms, except CLS)
 * @returns RES score from 0-100
 *
 * @example
 * computeRealExperienceScore({
 *   FCP: 1500,  // 1.5s
 *   LCP: 2200,  // 2.2s
 *   INP: 150,   // 150ms
 *   CLS: 0.05,  // 0.05
 * }) // → ~95
 */
export const computeRealExperienceScore = (metrics: {
  CLS: number;
  FCP: number;
  INP: number;
  LCP: number;
}): number => {
  let weightedSum = 0;

  for (const metric of Object.keys(RES_WEIGHTS) as RESMetricName[]) {
    const value = metrics[metric];
    const weight = RES_WEIGHTS[metric];
    const score = computeMetricScore(value, metric);
    weightedSum += score * weight;
  }

  return Math.round(weightedSum);
};

/**
 * Compute RES from WebVitalMetricStats objects (with p75 values in ms).
 *
 * This is the main entry point for calculating RES from aggregated data.
 * Handles the common case where metrics are stored with p75 percentiles.
 *
 * @param stats - Object containing metric stats with p75 values
 * @returns RES score from 0-100
 *
 * @example
 * // From aggregated web vitals data
 * const score = computeRESFromStats({
 *   FCP: { p75: 1500, ... },
 *   LCP: { p75: 2200, ... },
 *   INP: { p75: 150, ... },
 *   CLS: { p75: 0.05, ... },
 * });
 */
export const computeRESFromStats = (stats: {
  CLS: { p75: number };
  FCP: { p75: number };
  INP: { p75: number };
  LCP: { p75: number };
}): number => {
  return computeRealExperienceScore({
    CLS: stats.CLS.p75,
    FCP: stats.FCP.p75,
    INP: stats.INP.p75,
    LCP: stats.LCP.p75,
  });
};
