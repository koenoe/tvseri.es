import { METRICS_CONFIG, type MetricType } from '@/lib/web-vitals';

import { DataPointsBubble } from '../data-points';

import {
  type ChartDataPoint,
  PERCENTILES,
  type PercentileKey,
} from './constants';
import { PercentileRow } from './percentile-row';

type CustomTooltipProps = Readonly<{
  active?: boolean;
  activePercentiles: Set<PercentileKey>;
  label?: string;
  metric: MetricType;
  payload?: ReadonlyArray<Readonly<{ payload?: ChartDataPoint }>>;
}>;

export function CustomTooltip({
  active,
  activePercentiles,
  metric,
  payload,
}: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) {
    return null;
  }

  const metricConfig = METRICS_CONFIG[metric];

  return (
    <div className="pointer-events-none flex min-w-56 flex-col gap-1.5 text-sm">
      <div className="rounded-lg border border-border bg-black px-3 py-2.5 shadow-lg">
        <p className="text-xs text-neutral-500">{data.formattedDate}</p>
        <p className="font-semibold text-white">{metricConfig.label}</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {PERCENTILES.map(({ key, label }) => {
            const value = data[key];
            if (!activePercentiles.has(key) || value === undefined) return null;
            return (
              <PercentileRow
                key={key}
                label={label}
                metric={metric}
                value={value}
              />
            );
          })}
        </div>
      </div>
      <DataPointsBubble pageViews={data.pageviews} />
    </div>
  );
}

CustomTooltip.displayName = 'CustomTooltip';
