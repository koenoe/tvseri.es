import { useQuery } from '@tanstack/react-query';

import {
  type ApiMetricsEndpointDetailParams,
  type ApiMetricsEndpointsParams,
  type ApiMetricsSummaryParams,
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

const ONE_MINUTE = 1000 * 60;
const FIVE_MINUTES = 1000 * 60 * 5;

export function useMetricsSummary(params: MetricsSummaryParams) {
  return useQuery({
    gcTime: FIVE_MINUTES,
    queryFn: () => fetchMetricsSummary(params),
    queryKey: metricsKeys.summary(params),
    staleTime: ONE_MINUTE,
  });
}

export function useMetricsRoutes(params: MetricsRoutesParams) {
  return useQuery({
    gcTime: FIVE_MINUTES,
    queryFn: () => fetchMetricsRoutes(params),
    queryKey: metricsKeys.routes(params),
    staleTime: ONE_MINUTE,
  });
}

export function useMetricsCountries(params: MetricsCountriesParams) {
  return useQuery({
    gcTime: FIVE_MINUTES,
    queryFn: () => fetchMetricsCountries(params),
    queryKey: metricsKeys.countries(params),
    staleTime: ONE_MINUTE,
  });
}

export function useApiMetricsSummary(params: ApiMetricsSummaryParams) {
  return useQuery({
    gcTime: FIVE_MINUTES,
    queryFn: () => fetchApiMetricsSummary(params),
    queryKey: metricsKeys.apiSummary(params),
    staleTime: ONE_MINUTE,
  });
}

export function useApiMetricsEndpoints(params: ApiMetricsEndpointsParams) {
  return useQuery({
    gcTime: FIVE_MINUTES,
    queryFn: () => fetchApiMetricsEndpoints(params),
    queryKey: metricsKeys.apiEndpoints(params),
    staleTime: ONE_MINUTE,
  });
}

export function useApiMetricsEndpointDetail(
  params: ApiMetricsEndpointDetailParams,
) {
  return useQuery({
    enabled: Boolean(params.endpoint),
    gcTime: FIVE_MINUTES,
    queryFn: () => fetchApiMetricsEndpointDetail(params),
    queryKey: metricsKeys.apiEndpointDetail(params),
    staleTime: ONE_MINUTE,
  });
}
