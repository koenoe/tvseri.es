/**
 * Vercel's Real Experience Score (RES): each metric's p75 scored 0–100 on a
 * Lighthouse log-normal curve, then weighted. TTFB is not part of it.
 *
 * A curve is set by two control points: p10 scores 90, the median 50.
 *
 *   score = 100 × (1 − CDF(value)),  CDF = 0.5 × (1 + erf(z / √2))
 *   z = (ln(value) − μ) / σ,  μ = ln(median),  σ = (ln(median) − ln(p10)) / Φ⁻¹(0.9)
 *
 * @see https://vercel.com/docs/speed-insights/metrics#real-experience-score-res
 * @see https://web.dev/performance-scoring/
 * @see https://github.com/GoogleChrome/lighthouse/blob/main/core/audits/metrics/
 */

export type RESMetricName = 'CLS' | 'FCP' | 'INP' | 'LCP';

/** In ms; CLS is unitless */
const LIGHTHOUSE_CONTROL_POINTS: Readonly<
  Record<RESMetricName, { median: number; p10: number }>
> = {
  CLS: { median: 0.25, p10: 0.1 },
  FCP: { median: 3000, p10: 1800 },
  INP: { median: 500, p10: 200 },
  LCP: { median: 4000, p10: 2500 },
} as const;

/** Vercel's weights; they sum to 1 */
const RES_WEIGHTS: Readonly<Record<RESMetricName, number>> = {
  CLS: 0.25,
  FCP: 0.15,
  INP: 0.3,
  LCP: 0.3,
} as const;

/**
 * The error function, to within 1.5×10⁻⁷.
 *
 * @see Abramowitz and Stegun, Handbook of Mathematical Functions, formula 7.1.26
 */
const erf = (x: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // The formula holds for x ≥ 0; erf is odd, so the sign is put back after
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
};

/** Φ⁻¹(0.9): how many σ the p10 control point sits below the median */
const PROBIT_0_9 = 1.2815515655446004;

/**
 * A metric's 0–100 score: 90 at p10, 50 at the median. A missing (≤ 0) or
 * non-finite value scores 0, not 100.
 *
 * @example
 * computeMetricScore(2500, 'LCP') // → 90
 * computeMetricScore(1200, 'LCP') // → 100
 * computeMetricScore(6000, 'LCP') // → 13
 */
const computeMetricScore = (value: number, metric: RESMetricName): number => {
  if (value <= 0 || !Number.isFinite(value)) return 0;

  const { median, p10 } = LIGHTHOUSE_CONTROL_POINTS[metric];

  const mu = Math.log(median);
  const sigma = (Math.log(median) - Math.log(p10)) / PROBIT_0_9;

  const z = (Math.log(value) - mu) / sigma;
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));

  const score = 100 * (1 - cdf);
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * RES from p75 values (ms, CLS unitless). A metric without data (p75 ≤ 0)
 * is left out and the others reweighted, so missing data doesn't count as a
 * bad score; 0 when no metric has data.
 *
 * @example
 * computeRealExperienceScore({ FCP: 1500, LCP: 2200, INP: 150, CLS: 0.05 }) // → 96
 */
export const computeRealExperienceScore = (metrics: {
  CLS: number;
  FCP: number;
  INP: number;
  LCP: number;
}): number => {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const metric of Object.keys(RES_WEIGHTS) as RESMetricName[]) {
    const value = metrics[metric];

    if (value <= 0) {
      continue;
    }

    const weight = RES_WEIGHTS[metric];
    const score = computeMetricScore(value, metric);
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(weightedSum / totalWeight);
};

/** RES from aggregated stats' p75 values */
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
