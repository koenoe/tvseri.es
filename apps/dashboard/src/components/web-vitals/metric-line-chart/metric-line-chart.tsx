import type { MetricSeriesItem } from '@tvseri.es/schemas';
import { X } from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { getCountryDisplayName } from '@/lib/utils';
import {
  METRICS_CONFIG,
  type MetricType,
  RATING_COLORS,
} from '@/lib/web-vitals';

import {
  BLUE_500,
  CHART_CONFIG,
  type ChartDataPoint,
  PERCENTILES,
  type PercentileKey,
} from './constants';
import { CustomCursor } from './custom-cursor';
import { CustomTooltip } from './custom-tooltip';
import { PercentileToggle } from './percentile-toggle';
import {
  formatDate,
  formatValueForDisplay,
  getMetricDisplayValue,
  getTickConfig,
} from './utils';

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
  const isRES = metric === 'res';
  const metricConfig = METRICS_CONFIG[metric];

  // Create a map of existing data by date for quick lookup
  const seriesMap = useMemo(() => {
    const map = new Map<string, MetricSeriesItem>();
    for (const item of series) {
      map.set(item.date, item);
    }
    return map;
  }, [series]);

  // Generate full date range for the period (excludes today since data is aggregated nightly)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const result: ChartDataPoint[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    for (let i = days; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const item = seriesMap.get(dateStr);

      if (item) {
        result.push({
          date: dateStr,
          formattedDate: formatDate(dateStr),
          p75: getMetricDisplayValue(metric, item, 'p75'),
          p90: getMetricDisplayValue(metric, item, 'p90'),
          p95: getMetricDisplayValue(metric, item, 'p95'),
          p99: getMetricDisplayValue(metric, item, 'p99'),
          pageviews: item.pageviews,
        });
      } else {
        // No data for this date - include date but no values
        result.push({
          date: dateStr,
          formattedDate: formatDate(dateStr),
          p75: undefined as unknown as number,
          p90: undefined as unknown as number,
          p95: undefined as unknown as number,
          p99: undefined as unknown as number,
          pageviews: 0,
        });
      }
    }
    return result;
  }, [days, metric, seriesMap]);

  const yAxisMax = useMemo(() => {
    if (isRES) {
      return 100;
    }

    let dataMax = 0;
    for (const point of chartData) {
      for (const { key } of PERCENTILES) {
        if (activePercentiles.has(key)) {
          const value = point[key];
          if (value !== undefined && !Number.isNaN(value)) {
            dataMax = Math.max(dataMax, value);
          }
        }
      }
    }

    const { thresholdPoor } = metricConfig;
    const baseMax = thresholdPoor * 1.33;
    const effectiveMax = Math.max(baseMax, dataMax * 1.15);

    if (effectiveMax >= 1000) {
      return Math.ceil(effectiveMax / 100) * 100;
    }
    if (effectiveMax >= 100) {
      return Math.ceil(effectiveMax / 10) * 10;
    }
    if (effectiveMax >= 1) {
      return Math.ceil(effectiveMax * 2) / 2;
    }
    return Math.ceil(effectiveMax * 20) / 20;
  }, [activePercentiles, chartData, isRES, metricConfig]);

  // Y-axis domain uses the rounded max
  const yAxisDomain = useMemo(() => {
    return [0, yAxisMax];
  }, [yAxisMax]);

  const handleToggle = (key: PercentileKey) => {
    const next = new Set(activePercentiles);
    if (next.has(key)) {
      // Don't allow deselecting the last active percentile
      if (next.size > 1) {
        next.delete(key);
      }
    } else {
      next.add(key);
    }
    onPercentilesChange(next);
  };

  // Reference lines for thresholds (green for great, orange for poor)
  const referenceLines = isRES
    ? [
        { color: RATING_COLORS.great.hsl, value: 90 },
        { color: RATING_COLORS.needsImprovement.hsl, value: 50 },
      ]
    : [
        { color: RATING_COLORS.great.hsl, value: metricConfig.thresholdGreat },
        {
          color: RATING_COLORS.needsImprovement.hsl,
          value: metricConfig.thresholdPoor,
        },
      ];

  // Y-axis ticks: 0 and both thresholds (always visible since poor threshold is minimum top)
  const yAxisTicks = useMemo(() => {
    const thresholdGreat = isRES ? 90 : metricConfig.thresholdGreat;
    const thresholdPoor = isRES ? 50 : metricConfig.thresholdPoor;
    return [0, thresholdGreat, thresholdPoor, yAxisMax].sort((a, b) => a - b);
  }, [isRES, metricConfig, yAxisMax]);

  // Grid lines: midpoints between 0, great, poor, and max
  const gridLines = useMemo(() => {
    const thresholdGreat = isRES ? 90 : metricConfig.thresholdGreat;
    const thresholdPoor = isRES ? 50 : metricConfig.thresholdPoor;
    const points = [0, thresholdGreat, thresholdPoor, yAxisMax].sort(
      (a, b) => a - b,
    );
    const midpoints: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      if (current !== undefined && next !== undefined) {
        midpoints.push((current + next) / 2);
      }
    }
    return midpoints;
  }, [isRES, metricConfig, yAxisMax]);

  // Custom Y-axis tick renderer
  // biome-ignore lint/suspicious/noExplicitAny: Recharts tick props type
  const renderYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value as number;
    const { color, indicator } = getTickConfig(value, metric);
    const formattedValue = isRES
      ? value.toString()
      : `${formatValueForDisplay(metric, value)}${metricConfig.unit}`;

    // Right-align text, then position indicator after it
    const textX = x - 4; // Small margin from axis line
    const indicatorX = textX + 6; // Small gap after text end

    return (
      <g>
        <text
          dy={4}
          fontSize={12}
          style={{ fill: color }}
          textAnchor="end"
          x={textX}
          y={y}
        >
          {formattedValue}
        </text>
        {indicator === 'dot' && (
          <circle cx={indicatorX} cy={y} fill={color} r={3} />
        )}
        {indicator === 'triangle' && (
          <path
            d={`M${indicatorX - 3} ${y + 3} L${indicatorX} ${y - 3} L${indicatorX + 3} ${y + 3} Z`}
            fill={color}
          />
        )}
      </g>
    );
  };

  // Find the last index with actual data
  const lastDataIndex = useMemo(() => {
    for (let i = chartData.length - 1; i >= 0; i--) {
      const point = chartData[i];
      if (point && point.p75 !== undefined) {
        return i;
      }
    }
    return -1;
  }, [chartData]);

  // Custom label renderer for the end of each line
  const renderEndLabel = (label: string) => {
    // biome-ignore lint/suspicious/noExplicitAny: Recharts label props type
    return (props: any) => {
      const { x, y, index } = props;
      const isLast = index === lastDataIndex;
      if (!isLast) return <g />;
      return (
        <g>
          <circle cx={x} cy={y} fill={BLUE_500} r={4} />
          <text
            className="text-xs font-medium"
            dy={4}
            fill={BLUE_500}
            textAnchor="start"
            x={x + 8}
            y={y}
          >
            {label}
          </text>
        </g>
      );
    };
  };

  const countryDisplayName = country ? getCountryDisplayName(country) : null;

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center justify-end gap-6">
        {countryDisplayName && (
          <button
            className="flex cursor-pointer items-center gap-1 rounded-2xl border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
            onClick={onClearCountry}
            type="button"
          >
            {countryDisplayName}
            <X className="size-3" />
          </button>
        )}
        <PercentileToggle
          activePercentiles={activePercentiles}
          onToggle={handleToggle}
        />
      </div>
      <div className="-mx-4 h-[300px] w-[calc(100%+2rem)] lg:mx-0 lg:w-full">
        <ChartContainer
          className="!aspect-auto h-full w-full"
          config={CHART_CONFIG}
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ bottom: 0, left: 0, right: 32, top: 12 }}
          >
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
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 }}
              dataKey="formattedDate"
              interval={days <= 7 ? 0 : 6}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDataOverflow
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 }}
              domain={yAxisDomain}
              interval={0}
              tick={renderYAxisTick}
              tickLine={false}
              tickMargin={8}
              ticks={yAxisTicks}
              width={60}
            />
            {/* Threshold reference lines */}
            {referenceLines.map(({ color, value }) => (
              <ReferenceLine
                key={value}
                stroke={color}
                strokeDasharray="5 5"
                strokeWidth={1}
                y={value}
              />
            ))}
            {/* Tooltip with cursor BEFORE Lines so cursor renders underneath activeDots */}
            <ChartTooltip
              content={
                <CustomTooltip
                  activePercentiles={activePercentiles}
                  metric={metric}
                />
              }
              cursor={<CustomCursor />}
            />
            {/* Lines for each percentile - rendered AFTER tooltip for z-index */}
            {PERCENTILES.map(({ key, label }) => {
              const isActive = activePercentiles.has(key);
              return (
                <Line
                  activeDot={
                    isActive ? { fill: BLUE_500, r: 4, stroke: 'none' } : false
                  }
                  connectNulls={false}
                  dataKey={key}
                  dot={false}
                  isAnimationActive={false}
                  key={key}
                  stroke={BLUE_500}
                  strokeOpacity={isActive ? 1 : 0}
                  strokeWidth={2}
                  type="monotone"
                >
                  {isActive && (
                    <LabelList content={renderEndLabel(label)} dataKey={key} />
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
