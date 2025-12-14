import { createFileRoute } from '@tanstack/react-router';
import type { WebVitalRatings } from '@tvseri.es/schemas';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import {
  MetricTabContentSkeleton,
  TabTriggerValueSkeleton,
} from '@/components/skeletons';
import { PercentileBar } from '@/components/ui/percentile-bar';
import { ScoreRing } from '@/components/ui/score-ring';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { StatusAccordion, StatusColumns } from '@/components/web-vitals';
import {
  type AggregatedMetrics,
  groupCountriesByStatus,
  groupRoutesByStatus,
  useMetricsCountries,
  useMetricsRoutes,
  useMetricsSummary,
} from '@/lib/api';
import {
  getMetricStatus,
  getMetricStatusConfig,
  getRatingStatusConfig,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
} from '@/lib/web-vitals';

export const Route = createFileRoute('/')({
  component: Index,
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
  const metricName = METRICS_CONFIG[metric].name;

  if (status === 'great') {
    return `More than 75% of visits scored a great ${metricName}.`;
  }
  return `Less than 75% of visits scored a great ${metricName}.`;
}

type MetricTabContentProps = Readonly<{
  aggregated: AggregatedMetrics | null | undefined;
  device: string;
  metric: MetricType;
}>;

function MetricTabContent({
  aggregated,
  device,
  metric,
}: MetricTabContentProps) {
  const statusConfig = getRatingStatusConfig(metric);
  const metricConfig = METRICS_CONFIG[metric];

  const { data: routesData, isLoading: routesLoading } = useMetricsRoutes({
    days: 7,
    device,
  });
  const { data: countriesData, isLoading: countriesLoading } =
    useMetricsCountries({
      days: 7,
      device,
    });

  const isLoading = routesLoading || countriesLoading || !aggregated;

  if (isLoading) {
    return <MetricTabContentSkeleton />;
  }

  const metricValue = getMetricValue(metric, aggregated);
  const currentStatus = getMetricStatusConfig(metric, metricValue);
  const CurrentStatusIcon = currentStatus.Icon;

  const routesGrouped = routesData?.routes
    ? groupRoutesByStatus(routesData.routes, metric)
    : { great: [], needsImprovement: [], poor: [] };

  const countriesGrouped = countriesData?.countries
    ? groupCountriesByStatus(countriesData.countries, metric)
    : { great: [], needsImprovement: [], poor: [] };

  const displayValue = formatMetricDisplay(metric, metricValue);
  const unit = metricConfig.unit;

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-6 px-0 py-6 md:grid md:grid-cols-5 md:gap-16 md:p-6">
        <div className="md:col-span-2">
          <p className="mb-2 text-sm text-muted-foreground/70">
            {device === 'mobile' ? 'Mobile' : 'Desktop'}
          </p>
          <h3 className="text-2xl">{metricConfig.label}</h3>
          {metric === 'res' ? (
            <ScoreRing className="my-4" score={metricValue} size={90} />
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
            {currentStatus.threshold}
          </p>
          <p className="mt-4 text-muted-foreground">
            {aggregated && metric !== 'res'
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
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50 md:col-span-3 md:aspect-auto">
          <span className="text-muted-foreground">Chart placeholder</span>
        </div>
      </div>
      <hr className="border-border md:mx-6" />

      {/* Routes Section */}
      <div className="px-0 py-6 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Routes</h3>
          <span className="text-sm text-muted-foreground leading-normal">
            {metricConfig.name}
          </span>
        </div>
        <StatusColumns
          data={routesGrouped}
          statusConfig={statusConfig}
          variant="route"
        />
        <StatusAccordion
          className="rounded-lg border md:hidden"
          data={routesGrouped}
          defaultStatus={currentStatus.status}
          key={`routes-${metric}-${device}-${currentStatus.status}`}
          statusConfig={statusConfig}
          variant="route"
        />
      </div>
      <hr className="border-border md:mx-6" />

      {/* Countries Section */}
      <div className="px-0 py-6 md:py-6 md:pl-6 md:pr-1">
        <div className="mb-4 grid md:grid-cols-5">
          <div className="flex items-center justify-between md:col-span-3">
            <h3 className="font-semibold">Countries</h3>
            <span className="text-sm text-muted-foreground md:hidden">
              {metricConfig.name}
            </span>
          </div>
          <div className="hidden items-center justify-end md:col-span-2 md:flex">
            <span className="mr-5 text-sm text-muted-foreground">
              {metricConfig.name}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-6 md:grid md:grid-cols-5">
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/30 p-4 md:col-span-3">
            <p className="text-muted-foreground">Map placeholder</p>
          </div>
          <div className="md:col-span-2">
            <StatusAccordion
              data={countriesGrouped}
              defaultStatus={currentStatus.status}
              key={`countries-${metric}-${device}-${currentStatus.status}`}
              statusConfig={statusConfig}
              variant="country"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Index() {
  const [device, setDevice] = useState('desktop');
  const [activeMetric, setActiveMetric] = useState<MetricType>('res');

  const { data: summaryData, isLoading } = useMetricsSummary({
    days: 7,
    device,
  });
  const aggregated = summaryData?.aggregated;

  const noDataPlaceholder = (
    <span className="text-xl text-muted-foreground">—</span>
  );

  const getMetricP75 = (metric: MetricType): number => {
    return getMetricValue(metric, aggregated);
  };

  const getMetricTextColor = (metric: MetricType): string => {
    const value = getMetricP75(metric);
    const status = getMetricStatus(metric, value);
    const colors: Record<RatingStatus, string> = {
      great: 'text-green-500',
      needsImprovement: 'text-amber-500',
      poor: 'text-red-500',
    };
    return colors[status];
  };

  const getMetricRatings = (
    metric: Exclude<MetricType, 'res'>,
  ): WebVitalRatings | null => {
    if (!aggregated) return null;
    const key = metric.toUpperCase() as 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
    return aggregated[key]?.ratings ?? null;
  };

  const metricRatings: Record<
    Exclude<MetricType, 'res'>,
    WebVitalRatings | null
  > = {
    cls: getMetricRatings('cls'),
    fcp: getMetricRatings('fcp'),
    inp: getMetricRatings('inp'),
    lcp: getMetricRatings('lcp'),
    ttfb: getMetricRatings('ttfb'),
  };

  return (
    <div className="flex min-h-screen justify-center p-8">
      <div className="flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl">Web Vitals</h2>
            <a
              className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
              href="https://tvseri.es"
              rel="noopener noreferrer"
              target="_blank"
            >
              https://tvseri.es
              <ExternalLink className="size-3.5" />
            </a>
          </div>
          <ToggleGroup
            className="mr-5 w-fit gap-1 rounded-full border border-border p-1"
            onValueChange={(value) => value && setDevice(value)}
            type="single"
            value={device}
          >
            <ToggleGroupItem
              className="rounded-full px-5 py-1.5 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground"
              value="desktop"
            >
              Desktop
            </ToggleGroupItem>
            <ToggleGroupItem
              className="rounded-full px-5 py-1.5 text-xs text-muted-foreground data-[state=on]:bg-border data-[state=on]:text-foreground"
              value="mobile"
            >
              Mobile
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Tabs
          className="w-full"
          onValueChange={(value) => setActiveMetric(value as MetricType)}
          orientation="vertical"
          value={activeMetric}
        >
          <TabsList variant="card">
            <TabsTrigger
              className="flex flex-col gap-2 items-stretch text-left"
              value="res"
            >
              <span className="text-sm text-muted-foreground leading-normal">
                Real Experience Score
              </span>
              {isLoading ? (
                <TabTriggerValueSkeleton isScoreRing />
              ) : aggregated ? (
                <ScoreRing score={aggregated.score} size={36} />
              ) : (
                noDataPlaceholder
              )}
            </TabsTrigger>
            <TabsTrigger
              className="flex flex-col gap-2 items-stretch text-left"
              value="fcp"
            >
              <span className="text-sm text-muted-foreground leading-normal">
                First Contentful Paint
              </span>
              {isLoading ? (
                <TabTriggerValueSkeleton width="w-14" />
              ) : metricRatings.fcp ? (
                <div className="flex flex-col gap-1 w-full">
                  <span className={`text-xl h-7 ${getMetricTextColor('fcp')}`}>
                    {formatMetricDisplay('fcp', getMetricP75('fcp'))}
                    <span className="text-sm font-light ml-0.5 text-muted-foreground/60">
                      s
                    </span>
                  </span>
                  <PercentileBar
                    metric="fcp"
                    p75Value={getMetricP75('fcp')}
                    ratings={metricRatings.fcp}
                    variant="compact"
                  />
                </div>
              ) : (
                noDataPlaceholder
              )}
            </TabsTrigger>
            <TabsTrigger
              className="flex flex-col gap-2 items-stretch text-left"
              value="lcp"
            >
              <span className="text-sm text-muted-foreground leading-normal">
                Largest Contentful Paint
              </span>
              {isLoading ? (
                <TabTriggerValueSkeleton width="w-16" />
              ) : metricRatings.lcp ? (
                <div className="flex flex-col gap-1 w-full">
                  <span className={`text-xl h-7 ${getMetricTextColor('lcp')}`}>
                    {formatMetricDisplay('lcp', getMetricP75('lcp'))}
                    <span className="text-sm font-light ml-0.5 text-muted-foreground/60">
                      s
                    </span>
                  </span>
                  <PercentileBar
                    metric="lcp"
                    p75Value={getMetricP75('lcp')}
                    ratings={metricRatings.lcp}
                    variant="compact"
                  />
                </div>
              ) : (
                noDataPlaceholder
              )}
            </TabsTrigger>
            <TabsTrigger
              className="flex flex-col gap-2 items-stretch text-left"
              value="inp"
            >
              <span className="text-sm text-muted-foreground leading-normal">
                Interaction to Next Paint
              </span>
              {isLoading ? (
                <TabTriggerValueSkeleton width="w-20" />
              ) : metricRatings.inp ? (
                <div className="flex flex-col gap-1 w-full">
                  <span className={`text-xl h-7 ${getMetricTextColor('inp')}`}>
                    {formatMetricDisplay('inp', getMetricP75('inp'))}
                    <span className="text-sm font-light ml-0.5 text-muted-foreground/60">
                      ms
                    </span>
                  </span>
                  <PercentileBar
                    metric="inp"
                    p75Value={getMetricP75('inp')}
                    ratings={metricRatings.inp}
                    variant="compact"
                  />
                </div>
              ) : (
                noDataPlaceholder
              )}
            </TabsTrigger>
            <TabsTrigger
              className="flex flex-col gap-2 items-stretch text-left"
              value="cls"
            >
              <span className="text-sm text-muted-foreground leading-normal">
                Cumulative Layout Shift
              </span>
              {isLoading ? (
                <TabTriggerValueSkeleton width="w-6" />
              ) : metricRatings.cls ? (
                <div className="flex flex-col gap-1 w-full">
                  <span className={`text-xl h-7 ${getMetricTextColor('cls')}`}>
                    {formatMetricDisplay('cls', getMetricP75('cls'))}
                  </span>
                  <PercentileBar
                    metric="cls"
                    p75Value={getMetricP75('cls')}
                    ratings={metricRatings.cls}
                    variant="compact"
                  />
                </div>
              ) : (
                noDataPlaceholder
              )}
            </TabsTrigger>
            <TabsTrigger
              className="flex flex-col gap-2 items-stretch text-left"
              value="ttfb"
            >
              <span className="text-sm text-muted-foreground leading-normal">
                Time to First Byte
              </span>
              {isLoading ? (
                <TabTriggerValueSkeleton width="w-14" />
              ) : metricRatings.ttfb ? (
                <div className="flex flex-col gap-1 w-full">
                  <span className={`text-xl h-7 ${getMetricTextColor('ttfb')}`}>
                    {formatMetricDisplay('ttfb', getMetricP75('ttfb'))}
                    <span className="text-sm font-light ml-0.5 text-muted-foreground/60">
                      s
                    </span>
                  </span>
                  <PercentileBar
                    metric="ttfb"
                    p75Value={getMetricP75('ttfb')}
                    ratings={metricRatings.ttfb}
                    variant="compact"
                  />
                </div>
              ) : (
                noDataPlaceholder
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-hidden rounded-xl">
            <TabsContent className="m-0" value="res">
              <MetricTabContent
                aggregated={aggregated}
                device={device}
                metric="res"
              />
            </TabsContent>
            <TabsContent className="m-0" value="fcp">
              <MetricTabContent
                aggregated={aggregated}
                device={device}
                metric="fcp"
              />
            </TabsContent>
            <TabsContent className="m-0" value="lcp">
              <MetricTabContent
                aggregated={aggregated}
                device={device}
                metric="lcp"
              />
            </TabsContent>
            <TabsContent className="m-0" value="inp">
              <MetricTabContent
                aggregated={aggregated}
                device={device}
                metric="inp"
              />
            </TabsContent>
            <TabsContent className="m-0" value="cls">
              <MetricTabContent
                aggregated={aggregated}
                device={device}
                metric="cls"
              />
            </TabsContent>
            <TabsContent className="m-0" value="ttfb">
              <MetricTabContent
                aggregated={aggregated}
                device={device}
                metric="ttfb"
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
