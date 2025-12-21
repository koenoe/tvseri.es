/**
 * API client for metrics endpoints
 */

import type {
  AggregatedApiMetrics,
  ApiMetricsEndpointsResponse,
  ApiMetricsSummaryResponse,
  MetricsCountriesResponse,
  MetricsRoutesResponse,
  MetricsSummaryResponse,
} from '@tvseri.es/schemas';

import { getAccessToken } from '@/lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL;

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export type MetricsSummaryParams = Readonly<{
  country?: string;
  days?: number;
  device?: string;
}>;

export async function fetchMetricsSummary(
  params: MetricsSummaryParams,
): Promise<MetricsSummaryResponse> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.device) searchParams.set('device', params.device);
  if (params.country) searchParams.set('country', params.country);

  const url = `${API_BASE_URL}/metrics/web-vitals/summary?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics summary: ${response.statusText}`);
  }

  return response.json() as Promise<MetricsSummaryResponse>;
}

export type MetricsRoutesParams = Readonly<{
  country?: string;
  days?: number;
  device?: string;
  limit?: number;
  sortBy?: 'CLS' | 'INP' | 'LCP' | 'pageviews' | 'score';
  sortDir?: 'asc' | 'desc';
}>;

export async function fetchMetricsRoutes(
  params: MetricsRoutesParams,
): Promise<MetricsRoutesResponse> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.device) searchParams.set('device', params.device);
  if (params.country) searchParams.set('country', params.country);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const url = `${API_BASE_URL}/metrics/web-vitals/routes?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics routes: ${response.statusText}`);
  }

  return response.json() as Promise<MetricsRoutesResponse>;
}

export type MetricsCountriesParams = Readonly<{
  days?: number;
  device?: string;
  limit?: number;
  sortBy?: 'CLS' | 'INP' | 'LCP' | 'pageviews' | 'score';
  sortDir?: 'asc' | 'desc';
}>;

export async function fetchMetricsCountries(
  params: MetricsCountriesParams,
): Promise<MetricsCountriesResponse> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.device) searchParams.set('device', params.device);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const url = `${API_BASE_URL}/metrics/web-vitals/countries?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch metrics countries: ${response.statusText}`,
    );
  }

  return response.json() as Promise<MetricsCountriesResponse>;
}

export type ApiMetricsSummaryParams = Readonly<{
  days?: number;
  platform?: string;
}>;

export async function fetchApiMetricsSummary(
  params: ApiMetricsSummaryParams,
): Promise<ApiMetricsSummaryResponse> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.platform) searchParams.set('platform', params.platform);

  const url = `${API_BASE_URL}/metrics/api?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch API metrics summary: ${response.statusText}`,
    );
  }

  return response.json() as Promise<ApiMetricsSummaryResponse>;
}

export type ApiMetricsEndpointsParams = Readonly<{
  country?: string;
  days?: number;
  limit?: number;
  platform?: string;
  sortBy?: 'apdex' | 'errorRate' | 'p75' | 'p99' | 'requests';
  sortDir?: 'asc' | 'desc';
}>;

export async function fetchApiMetricsEndpoints(
  params: ApiMetricsEndpointsParams,
): Promise<ApiMetricsEndpointsResponse> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.platform) searchParams.set('platform', params.platform);
  if (params.country) searchParams.set('country', params.country);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const url = `${API_BASE_URL}/metrics/api/endpoints?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch API metrics endpoints: ${response.statusText}`,
    );
  }

  return response.json() as Promise<ApiMetricsEndpointsResponse>;
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

export async function fetchApiMetricsEndpointDetail(
  params: ApiMetricsEndpointDetailParams,
): Promise<ApiMetricsEndpointDetailResponse> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.set('days', params.days.toString());

  const encodedEndpoint = encodeURIComponent(params.endpoint);
  const url = `${API_BASE_URL}/metrics/api/endpoints/${encodedEndpoint}?${searchParams.toString()}`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch API metrics endpoint detail: ${response.statusText}`,
    );
  }

  return response.json() as Promise<ApiMetricsEndpointDetailResponse>;
}
