import type { MetricSeriesItem } from '@tvseri.es/schemas';
import { memo, type ReactElement, useCallback, useMemo } from 'react';
import {
  CartesianGrid,
  DefaultZIndexes,
  LabelList,
  type LabelProps,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  type YAxisTickContentProps,
} from 'recharts';

import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  METRICS_CONFIG,
  type MetricType,
  RATING_COLORS,
} from '@/lib/web-vitals';
import { CustomCursor, renderEndLabel, renderYAxisTick } from './chart-marks';
import { ChartToolbar } from './chart-toolbar';
import {
  BLUE_500,
  CHART_CONFIG,
  PERCENTILES,
  type PercentileKey,
} from './constants';
import { CustomTooltip } from './custom-tooltip';
import { useChartScale } from './use-chart-scale';

// Above the tooltip cursor, under the active dots
const LINE_Z_INDEX =
  (DefaultZIndexes.cursorLine + DefaultZIndexes.activeDot) / 2;

const CHART_MARGIN = { bottom: 0, left: 0, right: 32, top: 12 } as const;
const AXIS_LINE = {
  stroke: 'rgba(255, 255, 255, 0.15)',
  strokeWidth: 1,
} as const;
const ACTIVE_DOT = { fill: BLUE_500, r: 4, stroke: 'none' } as const;

type MetricLineChartProps = Readonly<{
  activePercentiles: Set<PercentileKey>;
  country: string | undefined;
  days: number;
  metric: MetricType;
  onClearCountry: () => void;
  onPercentilesChange: (percentiles: Set<PercentileKey>) => void;
  series: ReadonlyArray<MetricSeriesItem>;
}>;

function MetricLineChartComponent({
  activePercentiles,
  country,
  days,
  metric,
  onClearCountry,
  onPercentilesChange,
  series,
}: MetricLineChartProps) {
  const { chartData, gridLines, lastDataIndex, yAxisDomain, yAxisTicks } =
    useChartScale(series, days, metric, activePercentiles);
  const { thresholdGreat, thresholdPoor } = METRICS_CONFIG[metric];

  const renderTick = useCallback(
    (props: YAxisTickContentProps) => renderYAxisTick(metric, props),
    [metric],
  );

  const endLabels = useMemo(
    () =>
      Object.fromEntries(
        PERCENTILES.map(({ key, label }) => [
          key,
          (props: LabelProps) => renderEndLabel(label, lastDataIndex, props),
        ]),
      ) as Record<PercentileKey, (props: LabelProps) => ReactElement>,
    [lastDataIndex],
  );

  const tooltip = (
    <CustomTooltip activePercentiles={activePercentiles} metric={metric} />
  );
  const cursor = <CustomCursor />;

  return (
    <div className="flex flex-col">
      <ChartToolbar
        activePercentiles={activePercentiles}
        country={country}
        onClearCountry={onClearCountry}
        onPercentilesChange={onPercentilesChange}
      />
      <div className="-mx-4 h-[300px] w-[calc(100%+2rem)] lg:mx-0 lg:w-full">
        <ChartContainer
          className="!aspect-auto h-full w-full"
          config={CHART_CONFIG}
        >
          <LineChart accessibilityLayer data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid
              horizontal={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              vertical
            />
            {gridLines.map((value) => (
              <ReferenceLine
                key={`grid-${value}`}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={1}
                y={value}
              />
            ))}
            <XAxis
              axisLine={AXIS_LINE}
              dataKey="formattedDate"
              interval={days <= 7 ? 0 : 6}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDataOverflow
              axisLine={AXIS_LINE}
              domain={yAxisDomain}
              interval={0}
              tick={renderTick}
              tickLine={false}
              tickMargin={8}
              ticks={yAxisTicks}
              width={60}
            />
            <ReferenceLine
              stroke={RATING_COLORS.great.hsl}
              strokeDasharray="5 5"
              strokeWidth={1}
              y={thresholdGreat}
            />
            <ReferenceLine
              stroke={RATING_COLORS.needsImprovement.hsl}
              strokeDasharray="5 5"
              strokeWidth={1}
              y={thresholdPoor}
            />
            {/* Recharts 3 layers by zIndex, not render order: LINE_Z_INDEX keeps the cursor under the lines */}
            <ChartTooltip content={tooltip} cursor={cursor} />
            {PERCENTILES.map(({ key }) => {
              const isActive = activePercentiles.has(key);
              const activeDot = isActive ? ACTIVE_DOT : false;
              const strokeOpacity = isActive ? 1 : 0;
              return (
                <Line
                  activeDot={activeDot}
                  connectNulls={false}
                  dataKey={key}
                  dot={false}
                  isAnimationActive={false}
                  key={key}
                  stroke={BLUE_500}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={2}
                  type="monotone"
                  zIndex={LINE_Z_INDEX}
                >
                  {isActive && (
                    <LabelList content={endLabels[key]} dataKey={key} />
                  )}
                </Line>
              );
            })}
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}

MetricLineChartComponent.displayName = 'MetricLineChart';

export const MetricLineChart = memo(MetricLineChartComponent);
