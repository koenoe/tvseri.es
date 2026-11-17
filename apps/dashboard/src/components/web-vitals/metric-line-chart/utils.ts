import type { MetricSeriesItem } from '@tvseri.es/schemas';
import { computeRealExperienceScore } from '@tvseri.es/utils';

import {
  METRICS_CONFIG,
  type MetricType,
  RATING_COLORS,
  toThresholdUnits,
  toWebVitalName,
} from '@/lib/web-vitals';

import type { PercentileKey } from './constants';

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
  const isRES = metric === 'res';
  const metricConfig = METRICS_CONFIG[metric];
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
}
