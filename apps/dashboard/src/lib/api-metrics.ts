import type { DependencyStats, TimeSeriesPoint } from '@tvseri.es/schemas';

import { countryDisplayNames, STATUS_COLORS } from './status-colors';

export type ApdexStatus = 'frustrated' | 'satisfied' | 'tolerating';

type ApdexThreshold = Readonly<{
  bg: string;
  hsl: string;
  label: string;
  min: number;
  text: string;
  threshold: string;
}>;

export const APDEX_THRESHOLDS: Record<ApdexStatus, ApdexThreshold> = {
  frustrated: {
    ...STATUS_COLORS.red,
    label: 'Frustrated',
    min: 0,
    threshold: '<0.50',
  },
  satisfied: {
    ...STATUS_COLORS.green,
    label: 'Satisfied',
    min: 0.85,
    threshold: '≥0.85',
  },
  tolerating: {
    ...STATUS_COLORS.amber,
    label: 'Tolerating',
    min: 0.5,
    threshold: '0.50–0.84',
  },
} as const;

export const APDEX_STATUS_ORDER: ReadonlyArray<ApdexStatus> = [
  'satisfied',
  'tolerating',
  'frustrated',
];

export const getApdexStatus = (score: number): ApdexStatus => {
  if (score >= 0.85) return 'satisfied';
  if (score >= 0.5) return 'tolerating';
  return 'frustrated';
};

export const getApdexStatusConfig = (score: number) => {
  const status = getApdexStatus(score);
  return {
    ...APDEX_THRESHOLDS[status],
    status,
  };
};

export const formatApdexScore = (score: number): string => {
  return score.toFixed(2);
};

export type LatencyStatus = 'fast' | 'moderate' | 'slow';

type LatencyThreshold = Readonly<{
  bg: string;
  hsl: string;
  label: string;
  text: string;
}>;

export const LATENCY_THRESHOLDS: Record<LatencyStatus, LatencyThreshold> = {
  fast: {
    ...STATUS_COLORS.green,
    label: 'Fast',
  },
  moderate: {
    ...STATUS_COLORS.amber,
    label: 'Moderate',
  },
  slow: {
    ...STATUS_COLORS.red,
    label: 'Slow',
  },
} as const;

export const getLatencyStatus = (p75Ms: number): LatencyStatus => {
  if (p75Ms < 200) return 'fast';
  if (p75Ms < 500) return 'moderate';
  return 'slow';
};

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
    ...STATUS_COLORS.red,
    label: 'Critical',
  },
  healthy: {
    ...STATUS_COLORS.green,
    label: 'Healthy',
  },
  warning: {
    ...STATUS_COLORS.amber,
    label: 'Warning',
  },
} as const;

export const getErrorRateStatus = (errorRate: number): ErrorRateStatus => {
  if (errorRate < 1) return 'healthy';
  if (errorRate < 5) return 'warning';
  return 'critical';
};

export const formatErrorRate = (rate: number): string => {
  return `${rate.toFixed(2)}%`;
};

export const formatThroughput = (rpm: number): string => {
  const rps = rpm / 60;
  if (rps < 1) {
    return `${rps.toFixed(2)} req/s`;
  }
  if (rps < 10) {
    return `${rps.toFixed(1)} req/s`;
  }
  return `${Math.round(rps)} req/s`;
};

export const formatCount = (count: number): { unit: string; value: string } => {
  if (count < 1000) return { unit: '', value: count.toLocaleString() };
  if (count < 1_000_000) {
    const raw = count / 1000;
    const rounded = Math.round(raw * 10) / 10;
    return {
      unit: 'k',
      value: rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1),
    };
  }
  const raw = count / 1_000_000;
  const rounded = Math.round(raw * 10) / 10;
  return {
    unit: 'M',
    value: rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1),
  };
};

export const formatCountString = (count: number): string => {
  const { unit, value } = formatCount(count);
  return `${value}${unit}`;
};

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

export type DependencyMetricItem = Readonly<{
  errorRate: number;
  history?: ReadonlyArray<TimeSeriesPoint>;
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

export const formatDependencyName = (source: string): string => {
  return DEPENDENCY_NAMES[source.toLowerCase()] ?? source;
};

export const sortDependencyKeys = (keys: string[]): string[] => {
  return [...keys].sort((a, b) => b.localeCompare(a));
};

export const formatDependencies = (
  dependencies: Record<string, DependencyStats>,
): DependencyMetricItem[] => {
  const sortedKeys = sortDependencyKeys(Object.keys(dependencies));
  return sortedKeys.map((source) => {
    const stats = dependencies[source]!;
    return {
      errorRate: stats.errorRate,
      history: stats.history,
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
    };
  });
};
