import {
  METRICS_CONFIG,
  type MetricType,
  RATING_COLORS,
} from '@/lib/web-vitals';

import { formatValueForDisplay } from './utils';

type PercentileRowProps = Readonly<{
  isActive: boolean;
  label: string;
  metric: MetricType;
  value: number;
}>;

export function PercentileRow({
  isActive,
  label,
  metric,
  value,
}: PercentileRowProps) {
  const status =
    metric === 'res'
      ? value >= 90
        ? 'great'
        : value >= 50
          ? 'needsImprovement'
          : 'poor'
      : (() => {
          const config = METRICS_CONFIG[metric];
          if (value <= config.thresholdGreat) return 'great';
          if (value <= config.thresholdPoor) return 'needsImprovement';
          return 'poor';
        })();

  const colorConfig = RATING_COLORS[status];
  const displayValue = formatValueForDisplay(metric, value);
  const config = METRICS_CONFIG[metric];
  const unit = metric === 'res' ? '' : config.unit;

  return (
    <div className={`flex items-center gap-3 ${isActive ? '' : 'opacity-40'}`}>
      <span className="flex items-center gap-1.5 text-neutral-400">
        <span
          className={`size-2 rounded-full ${isActive ? 'bg-blue-500' : 'border border-current'}`}
        />
        {label}
      </span>
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-medium ${colorConfig.text}`}
        style={{ border: `1px solid ${colorConfig.hsl}` }}
      >
        {displayValue}
        {unit}
      </span>
    </div>
  );
}

PercentileRow.displayName = 'PercentileRow';
