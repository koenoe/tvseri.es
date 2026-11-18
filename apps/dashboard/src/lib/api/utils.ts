import type { CountryMetrics, RouteMetrics } from '@tvseri.es/schemas';

import { getCountryDisplayName } from '@/lib/utils';
import {
  formatMetricDisplay,
  getMetricStatus,
  getMetricValue,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
  type WebVitalsData,
} from '@/lib/web-vitals';

export type MetricItem = Readonly<{
  id?: string;
  label: string;
  pageViews: number;
  value: number | string;
}>;

export type GroupedMetricData = Readonly<{
  great: ReadonlyArray<MetricItem>;
  needsImprovement: ReadonlyArray<MetricItem>;
  poor: ReadonlyArray<MetricItem>;
}>;

/** RES shows the bare score; the others show p75 with their unit. */
function getDisplayValue(
  metric: MetricType,
  data: WebVitalsData,
): number | string {
  if (metric === 'res') {
    return data.score;
  }
  const value = getMetricValue(metric, data);
  return `${formatMetricDisplay(metric, value)}${METRICS_CONFIG[metric].unit}`;
}

/** Groups rows by their rating for `metric`, busiest first within a group. */
function groupByStatus<T extends WebVitalsData>(
  rows: ReadonlyArray<T>,
  metric: MetricType,
  toItem: (row: T) => Omit<MetricItem, 'value'>,
): GroupedMetricData {
  const groups: Record<RatingStatus, Array<MetricItem>> = {
    great: [],
    needsImprovement: [],
    poor: [],
  };

  for (const row of rows) {
    const status = getMetricStatus(metric, getMetricValue(metric, row));
    groups[status].push({
      ...toItem(row),
      value: getDisplayValue(metric, row),
    });
  }

  for (const items of Object.values(groups)) {
    items.sort((a, b) => b.pageViews - a.pageViews);
  }
  return groups;
}

export function groupRoutesByStatus(
  routes: ReadonlyArray<RouteMetrics>,
  metric: MetricType,
): GroupedMetricData {
  return groupByStatus(routes, metric, (route) => ({
    label: route.route,
    pageViews: route.pageviews,
  }));
}

export function groupCountriesByStatus(
  countries: ReadonlyArray<CountryMetrics>,
  metric: MetricType,
): GroupedMetricData {
  return groupByStatus(countries, metric, (country) => ({
    id: country.country,
    label: getCountryDisplayName(country.country),
    pageViews: country.pageviews,
  }));
}
