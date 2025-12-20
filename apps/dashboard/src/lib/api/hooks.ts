/**
 * React Query hooks for metrics API
 */
import { useQuery } from '@tanstack/react-query';

import {
  type ApiMetricsEndpointsParams,
  type ApiMetricsSummaryParams,
  fetchApiMetricsEndpoints,
  fetchApiMetricsSummary,
  fetchMetricsCountries,
  fetchMetricsRoutes,
  fetchMetricsSummary,
  type MetricsCountriesParams,
  type MetricsRoutesParams,
  type MetricsSummaryParams,
} from './client';

export function useMetricsSummary(params: MetricsSummaryParams) {
  return useQuery({
    queryFn: () => fetchMetricsSummary(params),
    queryKey: ['metrics', 'summary', params],
  });
}

export function useMetricsRoutes(params: MetricsRoutesParams) {
  return useQuery({
    queryFn: () => fetchMetricsRoutes(params),
    queryKey: ['metrics', 'routes', params],
  });
}

export function useMetricsCountries(params: MetricsCountriesParams) {
  return useQuery({
    queryFn: () => fetchMetricsCountries(params),
    queryKey: ['metrics', 'countries', params],
  });
}

export function useApiMetricsSummary(params: ApiMetricsSummaryParams) {
  return useQuery({
    queryFn: () => fetchApiMetricsSummary(params),
    queryKey: ['metrics', 'api', 'summary', params],
  });
}

export function useApiMetricsEndpoints(params: ApiMetricsEndpointsParams) {
  return useQuery({
    queryFn: () => fetchApiMetricsEndpoints(params),
    queryKey: ['metrics', 'api', 'endpoints', params],
  });
}
