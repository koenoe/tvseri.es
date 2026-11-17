import type { MetricSeriesItem } from '@tvseri.es/schemas';
import { computeRealExperienceScore } from '@tvseri.es/utils';

import {
  METRICS_CONFIG,
  type MetricType,
  RATING_COLORS,
  toThresholdUnits,
  toWebVitalName,
} from '@/lib/web-vitals';

import {
  type ChartDataPoint,
  PERCENTILES,
  type PercentileKey,
} from './constants';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * Get display value for a metric.
 * For RES, calculate score at the given percentile level.
 * For other metrics, convert ms to display units if needed.
 */
export function getMetricDisplayValue(
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

  return toThresholdUnits(metric, item[toWebVitalName(metric)][percentile]);
}

/**
 * Format a value for display in tooltips.
 */
export function formatValueForDisplay(
  metric: MetricType,
  value: number,
): string {
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

/**
 * Get tick config (color and indicator) based on value for Y-axis rendering.
 */
export function getTickConfig(
  value: number,
  metric: MetricType,
): { color: string; indicator: 'dot' | 'triangle' | null } {
  const { thresholdGreat, thresholdPoor } = METRICS_CONFIG[metric];

  if (value === thresholdGreat) {
    return { color: RATING_COLORS.great.hsl, indicator: 'dot' };
  }
  if (value === thresholdPoor) {
    return {
      color: RATING_COLORS.needsImprovement.hsl,
      indicator: 'triangle',
    };
  }
  // A literal grey: SVG fills can't use the theme's CSS variables here.
  return { color: 'rgb(115, 115, 115)', indicator: null };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * One point per day for the last `days` days, ending yesterday because the
 * data is aggregated nightly. Days without data keep their slot, valueless.
 */
export function buildChartData(
  series: ReadonlyArray<MetricSeriesItem>,
  days: number,
  metric: MetricType,
): ChartDataPoint[] {
  const byDate = new Map(series.map((item) => [item.date, item]));
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const result: ChartDataPoint[] = [];
  for (let i = days; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = toDateKey(date);
    const formattedDate = formatDate(dateStr);
    const item = byDate.get(dateStr);

    result.push(
      item
        ? {
            date: dateStr,
            formattedDate,
            p75: getMetricDisplayValue(metric, item, 'p75'),
            p90: getMetricDisplayValue(metric, item, 'p90'),
            p95: getMetricDisplayValue(metric, item, 'p95'),
            p99: getMetricDisplayValue(metric, item, 'p99'),
            pageviews: item.pageviews,
          }
        : { date: dateStr, formattedDate, pageviews: 0 },
    );
  }
  return result;
}

/**
 * The top of the y-axis: at least a third above the poor threshold so both
 * threshold lines show, 15% above the highest visible value, rounded.
 */
export function getYAxisMax(
  chartData: ReadonlyArray<ChartDataPoint>,
  activePercentiles: ReadonlySet<PercentileKey>,
  metric: MetricType,
): number {
  if (metric === 'res') {
    return 100;
  }

  let dataMax = 0;
  for (const point of chartData) {
    for (const { key } of PERCENTILES) {
      const value = point[key];
      if (
        activePercentiles.has(key) &&
        value !== undefined &&
        !Number.isNaN(value)
      ) {
        dataMax = Math.max(dataMax, value);
      }
    }
  }

  const baseMax = METRICS_CONFIG[metric].thresholdPoor * 1.33;
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
}

/** 0, both thresholds and the top, in ascending order. */
export function getYAxisTicks(metric: MetricType, yAxisMax: number): number[] {
  const { thresholdGreat, thresholdPoor } = METRICS_CONFIG[metric];
  return [0, thresholdGreat, thresholdPoor, yAxisMax].sort((a, b) => a - b);
}

/** Faint lines halfway between neighbouring ticks. */
export function getGridLines(ticks: ReadonlyArray<number>): number[] {
  const midpoints: number[] = [];
  for (let i = 0; i < ticks.length - 1; i++) {
    const current = ticks[i];
    const next = ticks[i + 1];
    if (current !== undefined && next !== undefined) {
      midpoints.push((current + next) / 2);
    }
  }
  return midpoints;
}

export function getLastDataIndex(
  chartData: ReadonlyArray<ChartDataPoint>,
): number {
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i]?.p75 !== undefined) return i;
  }
  return -1;
}
