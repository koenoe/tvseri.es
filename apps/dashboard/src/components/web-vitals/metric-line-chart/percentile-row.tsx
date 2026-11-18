import {
  getMetricStatus,
  METRICS_CONFIG,
  type MetricType,
} from '@/lib/web-vitals';

import { RatingPill } from '../data-points';
import { formatValueForDisplay } from './utils';

type PercentileRowProps = Readonly<{
  label: string;
  metric: MetricType;
  value: number;
}>;

export function PercentileRow({ label, metric, value }: PercentileRowProps) {
  const status = getMetricStatus(metric, value);
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
