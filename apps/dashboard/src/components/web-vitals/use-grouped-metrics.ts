import { useMemo } from 'react';

import { useMetricsCountries, useMetricsRoutes } from '@/lib/api/hooks';
import {
  type GroupedMetricData,
  groupCountriesByStatus,
  groupRoutesByStatus,
} from '@/lib/api/utils';
import type { MetricType } from '@/lib/web-vitals';

const EMPTY: GroupedMetricData = { great: [], needsImprovement: [], poor: [] };

type GroupedMetricsParams = Readonly<{
  country: string | undefined;
  days: number;
  device: string;
  metric: MetricType;
}>;

/** Routes (for the selected country) and countries, grouped by rating. */
export function useGroupedMetrics({
  country,
  days,
  device,
  metric,
}: GroupedMetricsParams) {
  const routes = useMetricsRoutes({ country, days, device });
  const countries = useMetricsCountries({ days, device });

  const routeRows = routes.data?.routes;
  const countryRows = countries.data?.countries;

  const routesGrouped = useMemo(
    () => (routeRows ? groupRoutesByStatus(routeRows, metric) : EMPTY),
    [routeRows, metric],
  );
  const countriesGrouped = useMemo(
    () => (countryRows ? groupCountriesByStatus(countryRows, metric) : EMPTY),
    [countryRows, metric],
  );

  return {
    countriesGrouped,
    isLoading: routes.isLoading || countries.isLoading,
    routesGrouped,
  };
}
