/**
 * API metrics utilities for Apdex-based status grouping
 * Similar to web-vitals.ts but for API performance metrics
 */

// ════════════════════════════════════════════════════════════════════════════
// APDEX STATUS TYPES AND THRESHOLDS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Official Apdex status levels.
 * Based on the Apdex standard where:
 * - Satisfied: score ≥ 0.85 (most users happy)
 * - Tolerating: 0.50 ≤ score < 0.85 (users tolerating)
 * - Frustrated: score < 0.50 (users frustrated)
 */
export type ApdexStatus = 'frustrated' | 'satisfied' | 'tolerating';

type ApdexThreshold = Readonly<{
  /** Background color class */
  bg: string;
  /** HSL color for charts */
  hsl: string;
  /** Human-readable label */
  label: string;
  /** Minimum score for this status (inclusive) */
  min: number;
  /** Text color class */
  text: string;
  /** Threshold label for display */
  threshold: string;
}>;

export const APDEX_THRESHOLDS: Record<ApdexStatus, ApdexThreshold> = {
  frustrated: {
    bg: 'bg-red-500',
    hsl: 'hsl(0, 72%, 51%)',
    label: 'Frustrated',
    min: 0,
    text: 'text-red-500',
    threshold: '<0.50',
  },
  satisfied: {
    bg: 'bg-green-500',
    hsl: 'hsl(142, 71%, 45%)',
    label: 'Satisfied',
    min: 0.85,
    text: 'text-green-500',
    threshold: '≥0.85',
  },
  tolerating: {
    bg: 'bg-amber-500',
    hsl: 'hsl(38, 92%, 50%)',
    label: 'Tolerating',
    min: 0.5,
    text: 'text-amber-500',
    threshold: '0.50–0.84',
  },
} as const;

/** Ordered from best to worst for display */
export const APDEX_STATUS_ORDER: ReadonlyArray<ApdexStatus> = [
  'satisfied',
  'tolerating',
  'frustrated',
];

// ════════════════════════════════════════════════════════════════════════════
// STATUS HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get Apdex status from score (official thresholds).
 */
export const getApdexStatus = (score: number): ApdexStatus => {
  if (score >= 0.85) return 'satisfied';
  if (score >= 0.5) return 'tolerating';
  return 'frustrated';
};

/**
 * Get full status config for an Apdex score.
 */
export const getApdexStatusConfig = (score: number) => {
  const status = getApdexStatus(score);
  return {
    ...APDEX_THRESHOLDS[status],
    status,
  };
};

/**
 * Format Apdex score for display (e.g., 0.94 → "0.94")
 */
export const formatApdexScore = (score: number): string => {
  return score.toFixed(2);
};

// ════════════════════════════════════════════════════════════════════════════
// LATENCY THRESHOLDS AND HELPERS
// ════════════════════════════════════════════════════════════════════════════

export type LatencyStatus = 'fast' | 'moderate' | 'slow';

type LatencyThreshold = Readonly<{
  bg: string;
  hsl: string;
  label: string;
  text: string;
}>;

export const LATENCY_THRESHOLDS: Record<LatencyStatus, LatencyThreshold> = {
  fast: {
    bg: 'bg-green-500',
    hsl: 'hsl(142, 71%, 45%)',
    label: 'Fast',
    text: 'text-green-500',
  },
  moderate: {
    bg: 'bg-amber-500',
    hsl: 'hsl(38, 92%, 50%)',
    label: 'Moderate',
    text: 'text-amber-500',
  },
  slow: {
    bg: 'bg-red-500',
    hsl: 'hsl(0, 72%, 51%)',
    label: 'Slow',
    text: 'text-red-500',
  },
} as const;

/**
 * Get latency status based on p75 value.
 * Thresholds based on typical API expectations:
 * - Fast: <200ms
 * - Moderate: 200-500ms
 * - Slow: >500ms
 */
export const getLatencyStatus = (p75Ms: number): LatencyStatus => {
  if (p75Ms < 200) return 'fast';
  if (p75Ms < 500) return 'moderate';
  return 'slow';
};

/**
 * Format latency for display.
 */
export const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export type PercentileKey = 'p75' | 'p90' | 'p95' | 'p99';

export const PERCENTILE_CONFIG: Record<
  PercentileKey,
  { description: string; label: string }
> = {
  p75: {
    description: '75% of requests are faster than this',
    label: 'p75',
  },
  p90: {
    description: '90% of requests are faster than this',
    label: 'p90',
  },
  p95: {
    description: '95% of requests are faster than this',
    label: 'p95',
  },
  p99: {
    description: '99% of requests are faster than this (tail latency)',
    label: 'p99',
  },
};

export type LatencyStats = Readonly<{
  count: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}>;

/**
 * Format all percentiles for display.
 */
export const formatLatencyStats = (
  stats: LatencyStats,
): Record<PercentileKey, string> => {
  return {
    p75: formatLatency(stats.p75),
    p90: formatLatency(stats.p90),
    p95: formatLatency(stats.p95),
    p99: formatLatency(stats.p99),
  };
};

// ════════════════════════════════════════════════════════════════════════════
// ERROR RATE THRESHOLDS
// ════════════════════════════════════════════════════════════════════════════

export type ErrorRateStatus = 'critical' | 'healthy' | 'warning';

type ErrorRateThreshold = Readonly<{
  bg: string;
  hsl: string;
  label: string;
  text: string;
}>;

export const ERROR_RATE_THRESHOLDS: Record<
  ErrorRateStatus,
  ErrorRateThreshold
> = {
  critical: {
    bg: 'bg-red-500',
    hsl: 'hsl(0, 72%, 51%)',
    label: 'Critical',
    text: 'text-red-500',
  },
  healthy: {
    bg: 'bg-green-500',
    hsl: 'hsl(142, 71%, 45%)',
    label: 'Healthy',
    text: 'text-green-500',
  },
  warning: {
    bg: 'bg-amber-500',
    hsl: 'hsl(38, 92%, 50%)',
    label: 'Warning',
    text: 'text-amber-500',
  },
} as const;

/**
 * Get error rate status.
 * - Healthy: <1%
 * - Warning: 1-5%
 * - Critical: >5%
 */
export const getErrorRateStatus = (errorRate: number): ErrorRateStatus => {
  if (errorRate < 1) return 'healthy';
  if (errorRate < 5) return 'warning';
  return 'critical';
};

/**
 * Format error rate for display.
 */
export const formatErrorRate = (rate: number): string => {
  return `${rate.toFixed(2)}%`;
};

// ════════════════════════════════════════════════════════════════════════════
// REQUEST COUNT HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Format request count for display.
 * >= 1000000 shows as 1M, 1.5M, etc.
 * >= 1000 shows as 1k, 1.5k, etc.
 * < 1000 shows full number.
 */
export const formatRequestCount = (count: number): string => {
  if (count < 1000) {
    return String(count);
  }
  if (count < 1000000) {
    const thousands = count / 1000;
    const formatted =
      thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}k`;
  }
  const millions = count / 1000000;
  const formatted =
    millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
  return `${formatted}M`;
};

// ════════════════════════════════════════════════════════════════════════════
// THROUGHPUT HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Format throughput (requests per minute) for display.
 */
export const formatThroughput = (rpm: number): string => {
  if (rpm < 1) return `${(rpm * 60).toFixed(1)}/hr`;
  if (rpm < 1000) return `${rpm.toFixed(1)}/min`;
  return `${(rpm / 1000).toFixed(1)}k/min`;
};

// ════════════════════════════════════════════════════════════════════════════
// GROUPING UTILITIES
// ════════════════════════════════════════════════════════════════════════════

export type EndpointMetricItem = Readonly<{
  apdexScore: number;
  endpoint: string;
  errorRate: number;
  latency: LatencyStats;
  requestCount: number;
  throughput: number;
}>;

export type GroupedEndpointData = Readonly<{
  frustrated: ReadonlyArray<EndpointMetricItem>;
  satisfied: ReadonlyArray<EndpointMetricItem>;
  tolerating: ReadonlyArray<EndpointMetricItem>;
}>;

/**
 * Group endpoints by their Apdex status.
 * Items within each group are sorted by Apdex score (best to worst).
 */
export const groupEndpointsByApdex = (
  endpoints: ReadonlyArray<{
    apdex: { score: number };
    endpoint: string;
    errorRate: number;
    latency: LatencyStats;
    requestCount: number;
    throughput: number;
  }>,
): GroupedEndpointData => {
  const groups: Record<ApdexStatus, EndpointMetricItem[]> = {
    frustrated: [],
    satisfied: [],
    tolerating: [],
  };

  for (const ep of endpoints) {
    const status = getApdexStatus(ep.apdex.score);
    groups[status].push({
      apdexScore: ep.apdex.score,
      endpoint: ep.endpoint,
      errorRate: ep.errorRate,
      latency: ep.latency,
      requestCount: ep.requestCount,
      throughput: ep.throughput,
    });
  }

  // Sort each group by Apdex score descending (best first)
  for (const status of APDEX_STATUS_ORDER) {
    groups[status].sort((a, b) => b.apdexScore - a.apdexScore);
  }

  return groups;
};

export type CountryMetricItem = Readonly<{
  apdexScore: number;
  country: string;
  countryName: string;
  errorRate: number;
  latency: LatencyStats;
  requestCount: number;
}>;

export type GroupedCountryData = Readonly<{
  frustrated: ReadonlyArray<CountryMetricItem>;
  satisfied: ReadonlyArray<CountryMetricItem>;
  tolerating: ReadonlyArray<CountryMetricItem>;
}>;

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });

/**
 * Group countries by their Apdex status.
 * Items within each group are sorted by Apdex score (best to worst).
 */
export const groupCountriesByApdex = (
  countries: ReadonlyArray<{
    apdex: { score: number };
    country: string;
    errorRate: number;
    latency: LatencyStats;
    requestCount: number;
  }>,
): GroupedCountryData => {
  const groups: Record<ApdexStatus, CountryMetricItem[]> = {
    frustrated: [],
    satisfied: [],
    tolerating: [],
  };

  for (const c of countries) {
    const status = getApdexStatus(c.apdex.score);
    const countryName = countryDisplayNames.of(c.country) ?? c.country;
    groups[status].push({
      apdexScore: c.apdex.score,
      country: c.country,
      countryName,
      errorRate: c.errorRate,
      latency: c.latency,
      requestCount: c.requestCount,
    });
  }

  // Sort each group by Apdex score descending (best first)
  for (const status of APDEX_STATUS_ORDER) {
    groups[status].sort((a, b) => b.apdexScore - a.apdexScore);
  }

  return groups;
};

export type PlatformMetricItem = Readonly<{
  apdexScore: number;
  errorRate: number;
  latency: LatencyStats;
  platform: string;
  requestCount: number;
}>;

export type GroupedPlatformData = Readonly<{
  frustrated: ReadonlyArray<PlatformMetricItem>;
  satisfied: ReadonlyArray<PlatformMetricItem>;
  tolerating: ReadonlyArray<PlatformMetricItem>;
}>;

/**
 * Group platforms by their Apdex status.
 * Items within each group are sorted by Apdex score (best to worst).
 */
export const groupPlatformsByApdex = (
  platforms: ReadonlyArray<{
    apdex: { score: number };
    errorRate: number;
    latency: LatencyStats;
    platform: string;
    requestCount: number;
  }>,
): GroupedPlatformData => {
  const groups: Record<ApdexStatus, PlatformMetricItem[]> = {
    frustrated: [],
    satisfied: [],
    tolerating: [],
  };

  for (const p of platforms) {
    const status = getApdexStatus(p.apdex.score);
    groups[status].push({
      apdexScore: p.apdex.score,
      errorRate: p.errorRate,
      latency: p.latency,
      platform: p.platform,
      requestCount: p.requestCount,
    });
  }

  // Sort each group by Apdex score descending (best first)
  for (const status of APDEX_STATUS_ORDER) {
    groups[status].sort((a, b) => b.apdexScore - a.apdexScore);
  }

  return groups;
};

// ════════════════════════════════════════════════════════════════════════════
// DEPENDENCY HELPERS
// ════════════════════════════════════════════════════════════════════════════

export type DependencyMetricItem = Readonly<{
  errorRate: number;
  latency: LatencyStats;
  source: string;
  sourceName: string;
  throughput: number;
}>;

const DEPENDENCY_NAMES: Record<string, string> = {
  dynamodb: 'DynamoDB',
  mdblist: 'MDBList',
  tmdb: 'TMDB',
};

/**
 * Format dependency source name for display.
 */
export const formatDependencyName = (source: string): string => {
  return DEPENDENCY_NAMES[source.toLowerCase()] ?? source;
};

/**
 * Transform raw dependency data into display format.
 */
export const formatDependencies = (
  dependencies: Record<
    string,
    {
      count: number;
      errorCount: number;
      errorRate: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      throughput: number;
    }
  >,
): DependencyMetricItem[] => {
  return Object.entries(dependencies)
    .map(([source, stats]) => ({
      errorRate: stats.errorRate,
      latency: {
        count: stats.count,
        p75: stats.p75,
        p90: stats.p90,
        p95: stats.p95,
        p99: stats.p99,
      },
      source,
      sourceName: formatDependencyName(source),
      throughput: stats.throughput,
    }))
    .sort((a, b) => b.latency.count - a.latency.count);
};
