import { createFileRoute } from '@tanstack/react-router';
import type { WebVitalRatings } from '@tvseri.es/schemas';
import { ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  MetricTabContentSkeleton,
  TabTriggerValueSkeleton,
} from '@/components/skeletons';
import { PercentileBar } from '@/components/ui/percentile-bar';
import { ScoreRing } from '@/components/ui/score-ring';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CountriesSection,
  StatusAccordion,
  StatusColumns,
  useViewAllModal,
  ViewAllModal,
} from '@/components/web-vitals';
import { WebVitalsHeader } from '@/components/web-vitals-header';
import {
  type AggregatedMetrics,
  groupCountriesByStatus,
  groupRoutesByStatus,
  useMetricsCountries,
  useMetricsRoutes,
  useMetricsSummary,
} from '@/lib/api';
import {
  getMetricStatusConfig,
  getMetricTextClass,
  getRatingStatusConfig,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
} from '@/lib/web-vitals';

type WebSearchParams = {
  days?: 3 | 7 | 30;
  device?: 'desktop' | 'mobile';
};

export const Route = createFileRoute('/web/')({
  component: WebVitals,
  staticData: {
    headerContent: WebVitalsHeader,
    title: 'Web Vitals',
  },
  validateSearch: (search: Record<string, unknown>): WebSearchParams => {
    const result: WebSearchParams = {};

    const device = search.device;
    if (device === 'mobile' || device === 'desktop') {
      result.device = device;
    }

    const days = Number(search.days);
    if (days === 3 || days === 7 || days === 30) {
      result.days = days;
    }

    return result;
  },
});

/**
 * Get the raw metric value (p75) for status comparison.
 * Converts milliseconds to seconds for metrics with 's' unit to match thresholds.
 */
function getMetricValue(
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
function formatMetricDisplay(metric: MetricType, value: number): string {
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

type MetricTabContentProps = Readonly<{
  aggregated: AggregatedMetrics | null | undefined;
  days: number;
  device: string;
  metric: MetricType;
}>;

function MetricTabContent({
  aggregated,
  days,
  device,
  metric,
}: MetricTabContentProps) {
  const statusConfig = getRatingStatusConfig(metric);
  const metricConfig = METRICS_CONFIG[metric];
  const { modalState, openModal, setOpen } = useViewAllModal();

  const { data: routesData, isLoading: routesLoading } = useMetricsRoutes({
    days,
    device,
  });
  const { data: countriesData, isLoading: countriesLoading } =
    useMetricsCountries({
      days,
      device,
    });

  const isLoading = routesLoading || countriesLoading || !aggregated;

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
                ratings={
                  aggregated[
                    metric.toUpperCase() as
                      | 'CLS'
                      | 'FCP'
                      | 'INP'
                      | 'LCP'
                      | 'TTFB'
                  ].ratings
                }
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
        <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50 lg:col-span-3 lg:aspect-auto">
          <span className="text-muted-foreground">Chart placeholder</span>
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
        countriesGrouped={countriesGrouped}
        currentStatus={currentStatus.status}
        metricLabel={metricConfig.label}
        metricName={metricConfig.name}
        onViewAll={handleCountriesViewAll}
        statusConfig={statusConfig}
        uniqueKey={`countries-${metric}-${device}-${currentStatus.status}`}
      />

      {/* Data Points Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
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
          {(metric === 'res'
            ? aggregated.pageviews
            : aggregated[
                metric.toUpperCase() as 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB'
              ].count
          ).toLocaleString()}{' '}
          data points
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

const TAB_SKELETON_WIDTHS: Record<Exclude<MetricType, 'res'>, string> = {
  cls: 'w-6',
  fcp: 'w-14',
  inp: 'w-20',
  lcp: 'w-16',
  ttfb: 'w-14',
};

const METRIC_ORDER: ReadonlyArray<MetricType> = [
  'res',
  'fcp',
  'lcp',
  'inp',
  'cls',
  'ttfb',
];

function WebVitals() {
  const { days: daysParam, device: deviceParam } = Route.useSearch();
  const days = daysParam ?? 7;
  const device = deviceParam ?? 'desktop';
  const [activeMetric, setActiveMetric] = useState<MetricType>('res');

  const { data: summaryData, isLoading } = useMetricsSummary({
    days,
    device,
  });
  const aggregated = summaryData?.aggregated;

  const noDataPlaceholder = (
    <span className="text-xl text-muted-foreground">-</span>
  );

  const getMetricP75 = (metric: MetricType): number => {
    return getMetricValue(metric, aggregated);
  };

  const getMetricRatings = (
    metric: Exclude<MetricType, 'res'>,
  ): WebVitalRatings | null => {
    if (!aggregated) return null;
    const key = metric.toUpperCase() as 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
    return aggregated[key]?.ratings ?? null;
  };

  const renderMetricTrigger = (metric: MetricType) => {
    const config = METRICS_CONFIG[metric];

    if (metric === 'res') {
      return (
        <TabsTrigger
          className="flex flex-col gap-2 items-stretch text-left"
          key={metric}
          value={metric}
        >
          <span className="text-sm text-muted-foreground leading-normal">
            {config.label}
          </span>
          {isLoading ? (
            <TabTriggerValueSkeleton isScoreRing />
          ) : aggregated ? (
            <ScoreRing score={aggregated.score} size={36} />
          ) : (
            noDataPlaceholder
          )}
        </TabsTrigger>
      );
    }

    const ratings = getMetricRatings(metric);
    const p75 = getMetricP75(metric);
    const textColor = getMetricTextClass(metric, p75);

    return (
      <TabsTrigger
        className="flex flex-col gap-2 items-stretch text-left"
        key={metric}
        value={metric}
      >
        <span className="text-sm text-muted-foreground leading-normal">
          {config.label}
        </span>
        {isLoading ? (
          <TabTriggerValueSkeleton width={TAB_SKELETON_WIDTHS[metric]} />
        ) : ratings ? (
          <div className="flex flex-col gap-1 w-full">
            <span className={`text-xl h-7 ${textColor}`}>
              {formatMetricDisplay(metric, p75)}
              {config.unit && (
                <span className="text-sm font-light ml-0.5 text-muted-foreground/60">
                  {config.unit}
                </span>
              )}
            </span>
            <PercentileBar
              metric={metric}
              p75Value={p75}
              ratings={ratings}
              variant="compact"
            />
          </div>
        ) : (
          noDataPlaceholder
        )}
      </TabsTrigger>
    );
  };

  return (
    <Tabs
      className="w-full gap-8"
      onValueChange={(value) => setActiveMetric(value as MetricType)}
      orientation="vertical"
      value={activeMetric}
    >
      <TabsList variant="card">
        {METRIC_ORDER.map(renderMetricTrigger)}
      </TabsList>
      <div className="flex-1">
        {METRIC_ORDER.map((metric) => (
          <TabsContent key={metric} value={metric}>
            <MetricTabContent
              aggregated={aggregated}
              days={days}
              device={device}
              metric={metric}
            />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
