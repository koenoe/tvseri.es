import { useQuery } from '@tanstack/react-query';

import {
  type ApiMetricsDependencyDetailParams,
  type ApiMetricsEndpointDetailParams,
  type ApiMetricsEndpointsParams,
  type ApiMetricsSummaryParams,
  fetchApiMetricsDependencyDetail,
  fetchApiMetricsEndpointDetail,
  fetchApiMetricsEndpoints,
  fetchApiMetricsSummary,
  fetchMetricsCountries,
  fetchMetricsRoutes,
  fetchMetricsSummary,
  type MetricsCountriesParams,
  type MetricsRoutesParams,
  type MetricsSummaryParams,
} from './client';
import { metricsKeys } from './query-keys';

// Metrics are aggregated once a day, so a minute of freshness is plenty.
const CACHE_TIMES = {
  gcTime: 1000 * 60 * 5,
  staleTime: 1000 * 60,
} as const;

export function useMetricsSummary(params: MetricsSummaryParams) {
  return useQuery({
    ...CACHE_TIMES,
    queryFn: () => fetchMetricsSummary(params),
    queryKey: metricsKeys.summary(params),
  });
}

export function useMetricsRoutes(params: MetricsRoutesParams) {
  return useQuery({
    ...CACHE_TIMES,
    queryFn: () => fetchMetricsRoutes(params),
    queryKey: metricsKeys.routes(params),
  });
}

export function useMetricsCountries(params: MetricsCountriesParams) {
  return useQuery({
    ...CACHE_TIMES,
    queryFn: () => fetchMetricsCountries(params),
    queryKey: metricsKeys.countries(params),
  });
}

export function useApiMetricsSummary(params: ApiMetricsSummaryParams) {
  return useQuery({
    ...CACHE_TIMES,
    queryFn: () => fetchApiMetricsSummary(params),
    queryKey: metricsKeys.apiSummary(params),
  });
}

export function useApiMetricsEndpoints(params: ApiMetricsEndpointsParams) {
  return useQuery({
    ...CACHE_TIMES,
    queryFn: () => fetchApiMetricsEndpoints(params),
    queryKey: metricsKeys.apiEndpoints(params),
  });
}

export function useApiMetricsEndpointDetail(
  params: ApiMetricsEndpointDetailParams,
) {
  return useQuery({
    ...CACHE_TIMES,
    enabled: Boolean(params.endpoint),
    queryFn: () => fetchApiMetricsEndpointDetail(params),
    queryKey: metricsKeys.apiEndpointDetail(params),
  });
}

export function useApiMetricsDependencyDetail(
  params: ApiMetricsDependencyDetailParams,
) {
  return useQuery({
    ...CACHE_TIMES,
    enabled: Boolean(params.source),
    queryFn: () => fetchApiMetricsDependencyDetail(params),
    queryKey: metricsKeys.apiDependencyDetail(params),
  });
}
