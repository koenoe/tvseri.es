import {
  getMetricStatus,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
} from '@/lib/web-vitals';

import { RatingPill } from '../data-points';
import { formatValueForDisplay } from './utils';

type PercentileRowProps = Readonly<{
  label: string;
  metric: MetricType;
  value: number;
}>;

// Unlike the RES score elsewhere, a tooltip value of exactly 90 counts as great.
function getStatus(metric: MetricType, value: number): RatingStatus {
  if (metric !== 'res') return getMetricStatus(metric, value);
  if (value >= 90) return 'great';
  if (value >= 50) return 'needsImprovement';
  return 'poor';
}

export function PercentileRow({ label, metric, value }: PercentileRowProps) {
  const status = getStatus(metric, value);
  const displayValue = formatValueForDisplay(metric, value);
  const unit = metric === 'res' ? '' : METRICS_CONFIG[metric].unit;

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-neutral-400">
        <span className="size-2 rounded-full bg-blue-500" />
        {label}
      </span>
      <RatingPill status={status}>
        {displayValue}
        {unit}
      </RatingPill>
    </div>
  );
}

PercentileRow.displayName = 'PercentileRow';
