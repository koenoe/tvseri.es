import type { AggregatedMetrics, MetricSeriesItem } from '@tvseri.es/schemas';
import { ArrowUpRight } from 'lucide-react';
import { memo, useMemo } from 'react';

import { MetricTabContentSkeleton } from '@/components/skeletons';
import { PercentileBar } from '@/components/ui/percentile-bar';
import { ScoreRing } from '@/components/ui/score-ring';
import { useMetricsCountries, useMetricsRoutes } from '@/lib/api/hooks';
import { groupCountriesByStatus, groupRoutesByStatus } from '@/lib/api/utils';
import {
  getMetricStatusConfig,
  getRatingStatusConfig,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
} from '@/lib/web-vitals';
import { CountriesSection } from './countries-section';
import { MetricLineChart, type PercentileKey } from './metric-line-chart';
import { StatusAccordion } from './status-accordion';
import { StatusColumns } from './status-columns';
import { useViewAllModal, ViewAllModal } from './view-all-modal';

/**
 * Get the raw metric value (p75) for status comparison.
 * Converts milliseconds to seconds for metrics with 's' unit to match thresholds.
 */
export function getMetricValue(
  metric: MetricType,
  aggregated: AggregatedMetrics | null | undefined,
): number {
  if (!aggregated) return 0;
  if (metric === 'res') return aggregated.score;
  const key = metric.toUpperCase() as 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  const p75 = aggregated[key]?.p75 ?? 0;
  const unit = METRICS_CONFIG[metric].unit;

  // Convert ms to seconds for metrics with 's' unit to match thresholds
  if (unit === 's') {
    return p75 / 1000;
  }
  return p75;
}

/**
 * Format a metric value for display with proper rounding.
 * Value is already in display units (seconds for 's' metrics, ms for 'ms' metrics).
 */
export function formatMetricDisplay(metric: MetricType, value: number): string {
  const config = METRICS_CONFIG[metric];
  if (metric === 'res') return Math.round(value).toString();
  if (config.unit === 's') return value.toFixed(2);
  if (config.unit === 'ms') return Math.round(value).toString();
  return value.toFixed(2);
}

/**
 * Get contextual message based on metric status.
 */
function getContextualMessage(
  metric: MetricType,
  status: RatingStatus,
): string {
  if (metric === 'res') {
    if (status === 'great') {
      return 'More than 75% of visits had a great experience.';
    }
    return 'Less than 75% of visits had a great experience.';
  }

  const metricName = METRICS_CONFIG[metric].name;

  if (status === 'great') {
    return `More than 75% of visits scored a great ${metricName}.`;
  }
  return `Less than 75% of visits scored a great ${metricName}.`;
}

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

  const { data: routesData, isLoading: routesLoading } = useMetricsRoutes({
    country,
    days,
    device,
  });
  const { data: countriesData, isLoading: countriesLoading } =
    useMetricsCountries({
      days,
      device,
    });

  const isLoading = parentLoading || routesLoading || countriesLoading;

  const routesGrouped = useMemo(
    () =>
      routesData?.routes
        ? groupRoutesByStatus(routesData.routes, metric)
        : { great: [], needsImprovement: [], poor: [] },
    [routesData?.routes, metric],
  );

  const countriesGrouped = useMemo(
    () =>
      countriesData?.countries
        ? groupCountriesByStatus(countriesData.countries, metric)
        : { great: [], needsImprovement: [], poor: [] },
    [countriesData?.countries, metric],
  );

  if (isLoading) {
    return <MetricTabContentSkeleton />;
  }

  // Parent should guard against this, but ensure type safety
  if (!aggregated) {
    return null;
  }

  const metricValue = getMetricValue(metric, aggregated);
  const currentStatus = getMetricStatusConfig(metric, metricValue);
  const CurrentStatusIcon = currentStatus.Icon;

  const displayValue = formatMetricDisplay(metric, metricValue);
  const unit = metricConfig.unit;

  const handleRoutesViewAll = (status: RatingStatus) => {
    openModal(routesGrouped, 'Routes', metricConfig.name, 'route', status);
  };

  const handleCountriesViewAll = (status: RatingStatus) => {
    openModal(
      countriesGrouped,
      'Countries',
      metricConfig.name,
      'country',
      status,
    );
  };

  const metricKey = metric.toUpperCase() as
    | 'CLS'
    | 'FCP'
    | 'INP'
    | 'LCP'
    | 'TTFB';
  const ratings = aggregated[metricKey].ratings;
  const dataPointCount =
    metric === 'res' ? aggregated.pageviews : aggregated[metricKey].count;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:pt-5 lg:grid lg:grid-cols-5 lg:gap-16">
        <div className="lg:col-span-2">
          <p className="mb-2 text-sm text-muted-foreground/70">
            {device === 'mobile' ? 'Mobile' : 'Desktop'}
          </p>
          <h3 className="text-2xl">{metricConfig.label}</h3>
          {metric === 'res' ? (
            <ScoreRing className="my-4" score={metricValue} size={65} />
          ) : (
            <>
              <p className={`my-2 text-4xl ${currentStatus.text}`}>
                {displayValue}
                {unit && (
                  <span className="text-lg font-normal ml-1 text-muted-foreground/60">
                    {unit}
                  </span>
                )}
              </p>
              <PercentileBar
                metric={metric}
                p75Value={metricValue}
                ratings={ratings}
              />
            </>
          )}
          <p className="mb-2 font-semibold text-md">{currentStatus.label}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CurrentStatusIcon className={`size-4 ${currentStatus.text}`} />
            {currentStatus.thresholdLabel}
          </p>
          <p className="mt-4 text-muted-foreground">
            {aggregated
              ? getContextualMessage(metric, currentStatus.status)
              : 'No data available for this period.'}
          </p>
          <hr className="my-4 border-border" />
          <p className="text-muted-foreground">{metricConfig.description}</p>
          <a
            className="mt-4 inline-flex items-center gap-1 text-blue-500 hover:text-blue-400"
            href={metricConfig.learnMoreUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Learn more about {metricConfig.name}
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
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

      {/* Routes Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Routes</h3>
          <span className="text-sm text-muted-foreground leading-normal">
            {metricConfig.name}
          </span>
        </div>
        <StatusColumns
          data={routesGrouped}
          onViewAll={handleRoutesViewAll}
          statusConfig={statusConfig}
          variant="route"
        />
        <StatusAccordion
          className="rounded-lg border lg:hidden"
          data={routesGrouped}
          defaultStatus={currentStatus.status}
          key={`routes-${metric}-${device}-${currentStatus.status}`}
          onViewAll={handleRoutesViewAll}
          statusConfig={statusConfig}
          variant="route"
        />
      </div>

      <hr className="border-border" />

      {/* Countries Section */}
      <CountriesSection
        activeCountry={country}
        countriesGrouped={countriesGrouped}
        currentStatus={currentStatus.status}
        metricLabel={metricConfig.label}
        metricName={metricConfig.name}
        onCountrySelect={onCountrySelect}
        onViewAll={handleCountriesViewAll}
        statusConfig={statusConfig}
        uniqueKey={`countries-${metric}-${device}-${currentStatus.status}`}
      />

      {/* Data Points Footer */}
      <div className="flex flex-col items-center gap-2 border-t border-border pt-4 text-center lg:flex-row lg:justify-between lg:text-left">
        <span className="text-sm text-muted-foreground/70">
          This report is based on{' '}
          <svg
            aria-hidden="true"
            className="inline size-3.5 text-muted-foreground/70"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <circle cx="10" cy="8" r="2" />
            <circle cx="5" cy="11" r="2" />
            <circle cx="5" cy="5" r="2" />
          </svg>{' '}
          {dataPointCount.toLocaleString()} data points
        </span>
        <span className="text-sm text-muted-foreground/70">
          Updated once a day
        </span>
      </div>

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
