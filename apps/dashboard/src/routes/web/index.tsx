import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { WebVitalRatings } from '@tvseri.es/schemas';
import { useState } from 'react';

import { TabTriggerValueSkeleton } from '@/components/skeletons';
import { PercentileBar } from '@/components/ui/percentile-bar';
import { ScoreRing } from '@/components/ui/score-ring';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatMetricDisplay,
  getMetricValue,
  MetricTabContent,
  type PercentileKey,
} from '@/components/web-vitals';
import { WebVitalsHeader } from '@/components/web-vitals-header';
import { useMetricsSummary } from '@/lib/api/hooks';
import {
  getMetricTextClass,
  METRICS_CONFIG,
  type MetricType,
} from '@/lib/web-vitals';

type WebSearchParams = {
  country?: string;
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

    const country = search.country;
    if (typeof country === 'string' && country.length > 0) {
      result.country = country;
    }

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
  const navigate = useNavigate({ from: Route.fullPath });
  const { country, days: daysParam, device: deviceParam } = Route.useSearch();
  const days = daysParam ?? 7;
  const device = deviceParam ?? 'desktop';
  const [activeMetric, setActiveMetric] = useState<MetricType>('res');
  const [activePercentiles, setActivePercentiles] = useState<
    Set<PercentileKey>
  >(() => new Set(['p75']));

  const handleCountrySelect = (selectedCountry: string) => {
    navigate({
      search: (prev) => ({ ...prev, country: selectedCountry }),
    });
  };

  const handleClearCountry = () => {
    navigate({
      search: (prev) => {
        const { country: _, ...rest } = prev;
        return rest;
      },
    });
  };

  const { data: summaryData, isLoading } = useMetricsSummary({
    country,
    days,
    device,
  });
  const aggregated = summaryData?.aggregated;
  const hasNoData = !isLoading && !aggregated;

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
        {hasNoData ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">
              No web vitals data available for this period.
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Data will appear once page views are recorded.
            </p>
          </div>
        ) : (
          METRIC_ORDER.map((metric) => (
            <TabsContent key={metric} value={metric}>
              <MetricTabContent
                activePercentiles={activePercentiles}
                aggregated={aggregated}
                country={country}
                days={days}
                device={device}
                isLoading={isLoading}
                metric={metric}
                onClearCountry={handleClearCountry}
                onCountrySelect={handleCountrySelect}
                onPercentilesChange={setActivePercentiles}
                series={summaryData?.series ?? []}
              />
            </TabsContent>
          ))
        )}
      </div>
    </Tabs>
  );
}
