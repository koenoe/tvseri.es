import type { AggregatedMetrics } from '@tvseri.es/schemas';

import { TabTriggerValueSkeleton } from '@/components/skeletons';
import { PercentileBar } from '@/components/ui/percentile-bar';
import { ScoreRing } from '@/components/ui/score-ring';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  formatMetricDisplay,
  getMetricTextClass,
  getMetricValue,
  METRICS_CONFIG,
  type MetricType,
  toWebVitalName,
  type WebVitalMetric,
} from '@/lib/web-vitals';

const TAB_SKELETON_WIDTHS: Record<WebVitalMetric, string> = {
  cls: 'w-6',
  fcp: 'w-14',
  inp: 'w-20',
  lcp: 'w-16',
  ttfb: 'w-14',
};

const NO_DATA = <span className="text-xl text-muted-foreground">-</span>;

type MetricTabTriggerProps = Readonly<{
  aggregated: AggregatedMetrics | null | undefined;
  isLoading: boolean;
  metric: MetricType;
}>;

function ScoreValue({
  aggregated,
  isLoading,
}: Omit<MetricTabTriggerProps, 'metric'>) {
  if (isLoading) return <TabTriggerValueSkeleton isScoreRing />;
  if (!aggregated) return NO_DATA;
  return <ScoreRing score={aggregated.score} size={36} />;
}

ScoreValue.displayName = 'ScoreValue';

function VitalValue({
  aggregated,
  isLoading,
  metric,
}: Omit<MetricTabTriggerProps, 'metric'> &
  Readonly<{ metric: WebVitalMetric }>) {
  if (isLoading) {
    return <TabTriggerValueSkeleton width={TAB_SKELETON_WIDTHS[metric]} />;
  }
  const ratings = aggregated?.[toWebVitalName(metric)]?.ratings;
  if (!ratings) return NO_DATA;

  const unit = METRICS_CONFIG[metric].unit;
  const p75 = getMetricValue(metric, aggregated);
  const valueClasses = cn('text-xl h-7', getMetricTextClass(metric, p75));

  return (
    <div className="flex flex-col gap-1 w-full">
      <span className={valueClasses}>
        {formatMetricDisplay(metric, p75)}
        {unit ? (
          <span className="text-sm font-light ml-0.5 text-muted-foreground/60">
            {unit}
          </span>
        ) : null}
      </span>
      <PercentileBar
        metric={metric}
        p75Value={p75}
        ratings={ratings}
        variant="compact"
      />
    </div>
  );
}

VitalValue.displayName = 'VitalValue';

/** A tab with the metric's name and its p75 (or the RES ring) at a glance. */
export function MetricTabTrigger({
  aggregated,
  isLoading,
  metric,
}: MetricTabTriggerProps) {
  return (
    <TabsTrigger
      className="flex flex-col gap-2 items-stretch text-left"
      value={metric}
    >
      <span className="text-sm text-muted-foreground leading-normal">
        {METRICS_CONFIG[metric].label}
      </span>
      {metric === 'res' ? (
        <ScoreValue aggregated={aggregated} isLoading={isLoading} />
      ) : (
        <VitalValue
          aggregated={aggregated}
          isLoading={isLoading}
          metric={metric}
        />
      )}
    </TabsTrigger>
  );
}

MetricTabTrigger.displayName = 'MetricTabTrigger';
