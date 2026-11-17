import type { DependencyStats, TimeSeriesPoint } from '@tvseri.es/schemas';

import { STATUS_COLORS, type StatusColor } from './status-colors';

export type ApdexStatus = 'frustrated' | 'satisfied' | 'tolerating';

type ApdexThreshold = Readonly<{
  bg: string;
  hsl: string;
  label: string;
  min: number;
  text: string;
  threshold: string;
}>;

const APDEX_THRESHOLDS: Record<ApdexStatus, ApdexThreshold> = {
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

const getApdexStatus = (score: number): ApdexStatus => {
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

export const getLatencyColor = (p75Ms: number): StatusColor => {
  if (p75Ms < 200) return 'green';
  if (p75Ms < 500) return 'amber';
  return 'red';
};

export const getErrorRateColor = (errorRate: number): StatusColor => {
  if (errorRate < 1) return 'green';
  if (errorRate < 5) return 'amber';
  return 'red';
};

// Error-rate bars and flat lines treat 10% as full scale.
export const ERROR_RATE_CEILING = 10;

export const countFilledBars = (errorRate: number, barCount: number): number =>
  Math.round(
    (Math.min(errorRate, ERROR_RATE_CEILING) / ERROR_RATE_CEILING) * barCount,
  );

export const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export type LatencyStats = Readonly<{
  count: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}>;

export const formatErrorRate = (rate: number): string => {
  return `${rate.toFixed(2)}%`;
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

export type StatusCodes = Readonly<{
  clientError: number;
  codes?: Readonly<Record<string, number>>;
  redirect: number;
  serverError: number;
  success: number;
}>;

/** Buckets per-code counts (e.g. {"200": 150, "500": 3}) by status class. */
export function toStatusCodes(
  codes: Readonly<Record<string, number>> = {},
): StatusCodes {
  const result = {
    clientError: 0,
    codes,
    redirect: 0,
    serverError: 0,
    success: 0,
  };

  for (const [code, count] of Object.entries(codes)) {
    const status = Number.parseInt(code, 10);
    if (status >= 200 && status < 300) result.success += count;
    else if (status >= 300 && status < 400) result.redirect += count;
    else if (status >= 400 && status < 500) result.clientError += count;
    else if (status >= 500) result.serverError += count;
  }

  return result;
}
