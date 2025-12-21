import type {
  ApiMetricsEndpointDetailParams,
  ApiMetricsEndpointsParams,
  ApiMetricsSummaryParams,
  MetricsCountriesParams,
  MetricsRoutesParams,
  MetricsSummaryParams,
} from './client';

export const metricsKeys = {
  all: ['metrics'] as const,

  api: () => [...metricsKeys.all, 'api'] as const,
  apiEndpointDetail: (params: ApiMetricsEndpointDetailParams) =>
    [...metricsKeys.api(), 'endpoint', params.endpoint, params] as const,
  apiEndpoints: (params: ApiMetricsEndpointsParams) =>
    [...metricsKeys.api(), 'endpoints', params] as const,
  apiSummary: (params: ApiMetricsSummaryParams) =>
    [...metricsKeys.api(), 'summary', params] as const,

  countries: (params: MetricsCountriesParams) =>
    [...metricsKeys.webVitals(), 'countries', params] as const,
  routes: (params: MetricsRoutesParams) =>
    [...metricsKeys.webVitals(), 'routes', params] as const,
  summary: (params: MetricsSummaryParams) =>
    [...metricsKeys.webVitals(), 'summary', params] as const,

  webVitals: () => [...metricsKeys.all, 'web-vitals'] as const,
};
