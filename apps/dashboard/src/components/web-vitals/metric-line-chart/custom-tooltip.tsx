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
  // biome-ignore lint/suspicious/noExplicitAny: Recharts tooltip payload type
  payload?: ReadonlyArray<any>;
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

  const data = payload[0]?.payload as ChartDataPoint | undefined;
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
          {PERCENTILES.filter(({ key }) => activePercentiles.has(key)).map(
            ({ key, label }) => (
              <PercentileRow
                key={key}
                label={label}
                metric={metric}
                value={data[key]}
              />
            ),
          )}
        </div>
      </div>
      <DataPointsBubble pageViews={data.pageviews} />
    </div>
  );
}

CustomTooltip.displayName = 'CustomTooltip';
