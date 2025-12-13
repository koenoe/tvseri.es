/**
 * React Query hooks for metrics API
 */
import { useQuery } from '@tanstack/react-query';

import {
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
