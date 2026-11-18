import type { AggregatedMetrics } from '@tvseri.es/schemas';
import { ArrowUpRight } from 'lucide-react';

import { PercentileBar } from '@/components/ui/percentile-bar';
import { ScoreRing } from '@/components/ui/score-ring';
import { cn } from '@/lib/utils';
import {
  formatMetricDisplay,
  getMetricStatusConfig,
  getMetricValue,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
  toWebVitalName,
  type WebVitalMetric,
} from '@/lib/web-vitals';

// p75 is great when more than three in four visits were great.
function getContextualMessage(
  metric: MetricType,
  status: RatingStatus,
): string {
  const share = status === 'great' ? 'More' : 'Less';
  if (metric === 'res') {
    return `${share} than 75% of visits had a great experience.`;
  }
  return `${share} than 75% of visits scored a great ${METRICS_CONFIG[metric].name}.`;
}

type MetricSummaryProps = Readonly<{
  aggregated: AggregatedMetrics;
  device: string;
  metric: MetricType;
}>;

function MetricReading({
  aggregated,
  metric,
  textClass,
  value,
}: Readonly<{
  aggregated: AggregatedMetrics;
  metric: WebVitalMetric;
  textClass: string;
  value: number;
}>) {
  const unit = METRICS_CONFIG[metric].unit;
  const valueClasses = cn('my-2 text-4xl', textClass);
  const ratings = aggregated[toWebVitalName(metric)].ratings;
  return (
    <>
      <p className={valueClasses}>
        {formatMetricDisplay(metric, value)}
        {unit ? (
          <span className="text-lg font-normal ml-1 text-muted-foreground/60">
            {unit}
          </span>
        ) : null}
      </p>
      <PercentileBar metric={metric} p75Value={value} ratings={ratings} />
    </>
  );
}

MetricReading.displayName = 'MetricReading';

/** The metric's p75, how it rates, and what the metric measures. */
export function MetricSummary({
  aggregated,
  device,
  metric,
}: MetricSummaryProps) {
  const metricConfig = METRICS_CONFIG[metric];
  const metricValue = getMetricValue(metric, aggregated);
  const currentStatus = getMetricStatusConfig(metric, metricValue);
  const StatusIcon = currentStatus.Icon;
  const iconClasses = cn('size-4', currentStatus.text);

  return (
    <div className="lg:col-span-2">
      <p className="mb-2 text-sm text-muted-foreground/70">
        {device === 'mobile' ? 'Mobile' : 'Desktop'}
      </p>
      <h3 className="text-2xl">{metricConfig.label}</h3>
      {metric === 'res' ? (
        <ScoreRing className="my-4" score={metricValue} size={65} />
      ) : (
        <MetricReading
          aggregated={aggregated}
          metric={metric}
          textClass={currentStatus.text}
          value={metricValue}
        />
      )}
      <p className="mb-2 font-semibold text-md">{currentStatus.label}</p>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <StatusIcon className={iconClasses} />
        {currentStatus.thresholdLabel}
      </p>
      <p className="mt-4 text-muted-foreground">
        {getContextualMessage(metric, currentStatus.status)}
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
  );
}

MetricSummary.displayName = 'MetricSummary';
