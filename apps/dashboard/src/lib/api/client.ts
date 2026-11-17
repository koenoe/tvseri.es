import type {
  AggregatedApiMetrics,
  ApiMetricsEndpointsResponse,
  ApiMetricsSummaryResponse,
  MetricsCountriesResponse,
  MetricsRoutesResponse,
  MetricsSummaryResponse,
} from '@tvseri.es/schemas';

import { authorizedFetch } from '@/lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL;

type QueryValue = number | string | undefined;

// Empty values are left out of the query string, so the API applies its defaults.
async function getMetrics<T>(
  path: string,
  query: ReadonlyArray<readonly [string, QueryValue]>,
  description: string,
): Promise<T> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of query) {
    if (value) searchParams.set(key, value.toString());
  }

  const url = `${API_BASE_URL}${path}?${searchParams.toString()}`;
  const response = await authorizedFetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${description}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export type MetricsSummaryParams = Readonly<{
  country?: string;
  days?: number;
  device?: string;
}>;

export function fetchMetricsSummary(
  params: MetricsSummaryParams,
): Promise<MetricsSummaryResponse> {
  return getMetrics<MetricsSummaryResponse>(
    '/metrics/web-vitals/summary',
    [
      ['days', params.days],
      ['device', params.device],
      ['country', params.country],
    ],
    'metrics summary',
  );
}

export type MetricsRoutesParams = Readonly<{
  country?: string;
  days?: number;
  device?: string;
  limit?: number;
  sortBy?: 'CLS' | 'INP' | 'LCP' | 'pageviews' | 'score';
  sortDir?: 'asc' | 'desc';
}>;

export function fetchMetricsRoutes(
  params: MetricsRoutesParams,
): Promise<MetricsRoutesResponse> {
  return getMetrics<MetricsRoutesResponse>(
    '/metrics/web-vitals/routes',
    [
      ['days', params.days],
      ['device', params.device],
      ['country', params.country],
      ['sortBy', params.sortBy],
      ['sortDir', params.sortDir],
      ['limit', params.limit],
    ],
    'metrics routes',
  );
}

export type MetricsCountriesParams = Readonly<{
  days?: number;
  device?: string;
  limit?: number;
  sortBy?: 'CLS' | 'INP' | 'LCP' | 'pageviews' | 'score';
  sortDir?: 'asc' | 'desc';
}>;

export function fetchMetricsCountries(
  params: MetricsCountriesParams,
): Promise<MetricsCountriesResponse> {
  return getMetrics<MetricsCountriesResponse>(
    '/metrics/web-vitals/countries',
    [
      ['days', params.days],
      ['device', params.device],
      ['sortBy', params.sortBy],
      ['sortDir', params.sortDir],
      ['limit', params.limit],
    ],
    'metrics countries',
  );
}

export type ApiMetricsSummaryParams = Readonly<{
  days?: number;
  platform?: string;
}>;

export function fetchApiMetricsSummary(
  params: ApiMetricsSummaryParams,
): Promise<ApiMetricsSummaryResponse> {
  return getMetrics<ApiMetricsSummaryResponse>(
    '/metrics/api',
    [
      ['days', params.days],
      ['platform', params.platform],
    ],
    'API metrics summary',
  );
}

export type ApiMetricsEndpointsParams = Readonly<{
  country?: string;
  days?: number;
  limit?: number;
  platform?: string;
  sortBy?: 'apdex' | 'errorRate' | 'p75' | 'p99' | 'requests';
  sortDir?: 'asc' | 'desc';
}>;

export function fetchApiMetricsEndpoints(
  params: ApiMetricsEndpointsParams,
): Promise<ApiMetricsEndpointsResponse> {
  return getMetrics<ApiMetricsEndpointsResponse>(
    '/metrics/api/endpoints',
    [
      ['days', params.days],
      ['platform', params.platform],
      ['country', params.country],
      ['sortBy', params.sortBy],
      ['sortDir', params.sortDir],
      ['limit', params.limit],
    ],
    'API metrics endpoints',
  );
}

export type ApiMetricsEndpointDetailParams = Readonly<{
  days?: number;
  endpoint: string;
}>;

export type ApiMetricsEndpointDetailResponse = Readonly<{
  aggregated: AggregatedApiMetrics | null;
  endDate: string;
  endpoint: string;
  series: ReadonlyArray<{
    apdex: AggregatedApiMetrics['apdex'];
    date: string;
    dependencies?: AggregatedApiMetrics['dependencies'];
    errorRate: number;
    latency: AggregatedApiMetrics['latency'];
    requestCount: number;
  }>;
  startDate: string;
}>;

export function fetchApiMetricsEndpointDetail(
  params: ApiMetricsEndpointDetailParams,
): Promise<ApiMetricsEndpointDetailResponse> {
  const encodedEndpoint = encodeURIComponent(params.endpoint);
  return getMetrics<ApiMetricsEndpointDetailResponse>(
    `/metrics/api/endpoints/${encodedEndpoint}`,
    [['days', params.days]],
    'API metrics endpoint detail',
  );
}

export type ApiMetricsDependencyDetailParams = Readonly<{
  days?: number;
  platform?: string;
  source: string;
}>;

export type ApiMetricsDependencyDetailResponse = Readonly<{
  aggregated: {
    count: number;
    errorCount: number;
    errorRate: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    throughput: number;
    topOperations?: ReadonlyArray<{
      codes?: Record<string, number>;
      count: number;
      errorCount: number;
      errorRate: number;
      operation: string;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      series?: ReadonlyArray<{
        date: string;
        errorRate: number;
        p75: number;
      }>;
    }>;
  } | null;
  endDate: string;
  series: ReadonlyArray<{
    count: number;
    date: string;
    errorRate: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  }>;
  source: string;
  startDate: string;
}>;

export function fetchApiMetricsDependencyDetail(
  params: ApiMetricsDependencyDetailParams,
): Promise<ApiMetricsDependencyDetailResponse> {
  const encodedSource = encodeURIComponent(params.source);
  return getMetrics<ApiMetricsDependencyDetailResponse>(
    `/metrics/api/dependencies/${encodedSource}`,
    [
      ['days', params.days],
      ['platform', params.platform],
    ],
    'API metrics dependency detail',
  );
}
