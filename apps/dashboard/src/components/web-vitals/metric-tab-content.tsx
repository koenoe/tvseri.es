import type { AggregatedMetrics, MetricSeriesItem } from '@tvseri.es/schemas';
import { memo, useCallback } from 'react';

import { MetricTabContentSkeleton } from '@/components/skeletons';
import {
  getMetricStatus,
  getMetricValue,
  getRatingStatusConfig,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
  toWebVitalName,
} from '@/lib/web-vitals';
import { CountriesSection } from './countries-section';
import { DataPointsFooter } from './data-points';
import type { PercentileKey } from './metric-line-chart/constants';
import { MetricLineChart } from './metric-line-chart/metric-line-chart';
import { MetricSummary } from './metric-summary';
import { RoutesSection } from './routes-section';
import { useGroupedMetrics } from './use-grouped-metrics';
import { useViewAllModal } from './use-view-all-modal';
import { ViewAllModal } from './view-all-modal';

export type MetricTabContentProps = Readonly<{
  activePercentiles: Set<PercentileKey>;
  aggregated: AggregatedMetrics | null | undefined;
  country: string | undefined;
  days: number;
  device: string;
  isLoading: boolean;
  metric: MetricType;
  onClearCountry: () => void;
  onCountrySelect: (country: string) => void;
  onPercentilesChange: (percentiles: Set<PercentileKey>) => void;
  series: ReadonlyArray<MetricSeriesItem>;
}>;

function MetricTabContentComponent({
  activePercentiles,
  aggregated,
  country,
  days,
  device,
  isLoading: parentLoading,
  metric,
  onClearCountry,
  onCountrySelect,
  onPercentilesChange,
  series,
}: MetricTabContentProps) {
  const statusConfig = getRatingStatusConfig(metric);
  const metricConfig = METRICS_CONFIG[metric];
  const { modalState, openModal, setOpen } = useViewAllModal();

  const grouped = useGroupedMetrics({ country, days, device, metric });
  const { countriesGrouped, routesGrouped } = grouped;
  const isLoading = parentLoading || grouped.isLoading;

  const handleRoutesViewAll = useCallback(
    (status: RatingStatus) => {
      openModal(routesGrouped, 'Routes', metricConfig.name, 'route', status);
    },
    [openModal, routesGrouped, metricConfig],
  );

  const handleCountriesViewAll = useCallback(
    (status: RatingStatus) => {
      openModal(
        countriesGrouped,
        'Countries',
        metricConfig.name,
        'country',
        status,
      );
    },
    [openModal, countriesGrouped, metricConfig],
  );

  if (isLoading) {
    return <MetricTabContentSkeleton />;
  }

  // The page shows its own empty state before rendering tabs without data.
  if (!aggregated) {
    return null;
  }

  const metricValue = getMetricValue(metric, aggregated);
  const currentStatus = getMetricStatus(metric, metricValue);
  const dataPointCount =
    metric === 'res'
      ? aggregated.pageviews
      : aggregated[toWebVitalName(metric)].count;
  const routesKey = `routes-${metric}-${device}-${currentStatus}`;
  const countriesKey = `countries-${metric}-${device}-${currentStatus}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:pt-5 lg:grid lg:grid-cols-5 lg:gap-16">
        <MetricSummary
          aggregated={aggregated}
          device={device}
          metric={metric}
        />
        <div className="lg:col-span-3">
          <MetricLineChart
            activePercentiles={activePercentiles}
            country={country}
            days={days}
            metric={metric}
            onClearCountry={onClearCountry}
            onPercentilesChange={onPercentilesChange}
            series={series}
          />
        </div>
      </div>

      <hr className="border-border" />

      <RoutesSection
        accordionKey={routesKey}
        currentStatus={currentStatus}
        metricName={metricConfig.name}
        onViewAll={handleRoutesViewAll}
        routesGrouped={routesGrouped}
        statusConfig={statusConfig}
      />

      <hr className="border-border" />

      <CountriesSection
        activeCountry={country}
        countriesGrouped={countriesGrouped}
        currentStatus={currentStatus}
        metricLabel={metricConfig.label}
        metricName={metricConfig.name}
        onCountrySelect={onCountrySelect}
        onViewAll={handleCountriesViewAll}
        statusConfig={statusConfig}
        uniqueKey={countriesKey}
      />

      <DataPointsFooter count={dataPointCount} />

      <ViewAllModal
        data={modalState.data}
        initialFilter={modalState.initialFilter}
        metricName={modalState.metricName}
        onOpenChange={setOpen}
        open={modalState.open}
        title={modalState.title}
        variant={modalState.variant}
      />
    </div>
  );
}

MetricTabContentComponent.displayName = 'MetricTabContent';

export const MetricTabContent = memo(MetricTabContentComponent);
