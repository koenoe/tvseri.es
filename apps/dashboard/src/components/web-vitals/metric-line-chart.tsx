import type { MetricSeriesItem } from '@tvseri.es/schemas';
import { computeRealExperienceScore } from '@tvseri.es/utils';
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

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import { formatCountString } from '@/lib/api-metrics';
import { countryDisplayNames } from '@/lib/status-colors';
import {
  getMetricStatus,
  METRICS_CONFIG,
  type MetricType,
  RATING_COLORS,
} from '@/lib/web-vitals';

export type PercentileKey = 'p75' | 'p90' | 'p95' | 'p99';

const PERCENTILES: ReadonlyArray<{
  key: PercentileKey;
  label: string;
}> = [
  { key: 'p75', label: 'P75' },
  { key: 'p90', label: 'P90' },
  { key: 'p95', label: 'P95' },
  { key: 'p99', label: 'P99' },
];

// Use the same blue-500 color for all percentile lines
const BLUE_500 = 'rgb(59, 130, 246)';
const DOT_RADIUS = 4;

// Custom cursor - just the white vertical line (dots handled by Line's activeDot)
// biome-ignore lint/suspicious/noExplicitAny: Recharts cursor props type
function CustomCursor({ points, top, height }: any) {
  if (!points || points.length === 0) return null;

  const x = points[0].x;
  const chartTop = top ?? 0;
  const chartBottom = chartTop + (height ?? 300);

  return (
    <line
      stroke="white"
      strokeWidth={1}
      x1={x}
      x2={x}
      y1={chartTop}
      y2={chartBottom}
    />
  );
}

const CHART_CONFIG: ChartConfig = {
  p75: { color: BLUE_500, label: 'P75' },
  p90: { color: BLUE_500, label: 'P90' },
  p95: { color: BLUE_500, label: 'P95' },
  p99: { color: BLUE_500, label: 'P99' },
};

type ChartDataPoint = Readonly<{
  date: string;
  formattedDate: string;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  pageviews: number;
}>;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * Get display value for a metric.
 * For RES, calculate score at the given percentile level.
 * For other metrics, convert ms to display units if needed.
 */
function getMetricDisplayValue(
  metric: MetricType,
  item: MetricSeriesItem,
  percentile: PercentileKey,
): number {
  if (metric === 'res') {
    // Calculate RES at this percentile level using the corresponding
    // percentile values from each metric
    return computeRealExperienceScore({
      CLS: item.CLS[percentile],
      FCP: item.FCP[percentile],
      INP: item.INP[percentile],
      LCP: item.LCP[percentile],
    });
  }

  const key = metric.toUpperCase() as 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  const metricData = item[key];
  const rawValue = metricData[percentile];
  const unit = METRICS_CONFIG[metric].unit;

  // Convert ms to seconds for metrics with 's' unit to match thresholds
  if (unit === 's') {
    return rawValue / 1000;
  }
  return rawValue;
}

/**
 * Format a value for display in tooltips.
 */
function formatValueForDisplay(metric: MetricType, value: number): string {
  const config = METRICS_CONFIG[metric];
  if (metric === 'res') return Math.round(value).toString();
  if (config.unit === 's') {
    const formatted = value.toFixed(2);
    return formatted.replace(/\.?0+$/, '');
  }
  if (config.unit === 'ms') return Math.round(value).toString();
  const formatted = value.toFixed(2);
  return formatted.replace(/\.?0+$/, '');
}

type PercentileToggleProps = Readonly<{
  activePercentiles: Set<PercentileKey>;
  onToggle: (key: PercentileKey) => void;
}>;

function PercentileToggle({
  activePercentiles,
  onToggle,
}: PercentileToggleProps) {
  return (
    <div className="flex items-center gap-4">
      {PERCENTILES.map(({ key, label }) => {
        const isActive = activePercentiles.has(key);
        return (
          <button
            className={`flex cursor-pointer items-center gap-1.5 text-sm transition-opacity ${
              isActive
                ? 'text-blue-500'
                : 'text-muted-foreground opacity-40 hover:opacity-60'
            }`}
            key={key}
            onClick={() => onToggle(key)}
            type="button"
          >
            <span
              className={`size-2.5 rounded-full ${
                isActive ? 'bg-blue-500' : 'border border-current'
              }`}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

PercentileToggle.displayName = 'PercentileToggle';

type DataPointsIndicatorProps = Readonly<{
  pageviews: number;
}>;

function DataPointsIndicator({ pageviews }: DataPointsIndicatorProps) {
  const config =
    pageviews > 100
      ? { color: 'text-green-500', dots: 3 }
      : pageviews >= 50
        ? { color: 'text-amber-500', dots: 2 }
        : { color: 'text-red-500', dots: 1 };

  return (
    <span className={`flex items-center gap-0.5 ${config.color}`}>
      {formatCountString(pageviews)}
      <svg className="size-4" fill="currentColor" viewBox="0 0 16 16">
        {config.dots >= 1 && <circle cx="10" cy="8" r="2" />}
        {config.dots >= 2 && <circle cx="5" cy="11" r="2" />}
        {config.dots >= 3 && <circle cx="5" cy="5" r="2" />}
      </svg>
    </span>
  );
}

DataPointsIndicator.displayName = 'DataPointsIndicator';

type CustomTooltipProps = Readonly<{
  active?: boolean;
  activePercentiles: Set<PercentileKey>;
  label?: string;
  metric: MetricType;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts tooltip payload type
  payload?: ReadonlyArray<any>;
}>;

function CustomTooltip({
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
      {/* First bubble: Date + metric values */}
      <div className="rounded-lg border border-border bg-black px-3 py-2.5 shadow-lg">
        <p className="text-xs text-neutral-500">{data.formattedDate}</p>
        <p className="font-semibold text-white">{metricConfig.label}</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {PERCENTILES.filter(({ key }) => activePercentiles.has(key)).map(
            ({ key, label }) => (
              <PercentileRow
                isActive={activePercentiles.has(key)}
                key={key}
                label={label}
                metric={metric}
                value={data[key]}
              />
            ),
          )}
        </div>
      </div>
      {/* Second bubble: Data points */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-black px-3 py-2 text-neutral-400 shadow-lg">
        <span>Data points</span>
        <DataPointsIndicator pageviews={data.pageviews} />
      </div>
    </div>
  );
}

CustomTooltip.displayName = 'CustomTooltip';

type PercentileRowProps = Readonly<{
  isActive: boolean;
  label: string;
  metric: MetricType;
  value: number;
}>;

function PercentileRow({ isActive, label, metric, value }: PercentileRowProps) {
  const status = getMetricStatus(metric, value);
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

  // Get tick config (color and indicator) based on value
  const getTickConfig = (
    value: number,
  ): { color: string; indicator: 'dot' | 'triangle' | null } => {
    const thresholdGreat = isRES ? 90 : metricConfig.thresholdGreat;
    const thresholdPoor = isRES ? 50 : metricConfig.thresholdPoor;

    if (value === thresholdGreat) {
      return { color: RATING_COLORS.great.hsl, indicator: 'dot' };
    }
    if (value === thresholdPoor) {
      return {
        color: RATING_COLORS.needsImprovement.hsl,
        indicator: 'triangle',
      };
    }
    // Use explicit grey color for SVG compatibility
    return { color: 'rgb(115, 115, 115)', indicator: null };
  };

  // Custom Y-axis tick renderer
  // biome-ignore lint/suspicious/noExplicitAny: Recharts tick props type
  const renderYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value as number;
    const { color, indicator } = getTickConfig(value);
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

  const countryDisplayName = country
    ? (countryDisplayNames.of(country) ?? country)
    : null;

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
                    isActive
                      ? { fill: BLUE_500, r: DOT_RADIUS, stroke: 'none' }
                      : false
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
