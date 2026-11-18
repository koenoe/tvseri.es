import type { MetricSeriesItem } from '@tvseri.es/schemas';
import { useMemo } from 'react';

import type { MetricType } from '@/lib/web-vitals';

import type { PercentileKey } from './constants';
import {
  buildChartData,
  getGridLines,
  getLastDataIndex,
  getYAxisMax,
  getYAxisTicks,
} from './utils';

/** The chart's daily points and the y-axis that fits the visible percentiles. */
export function useChartScale(
  series: ReadonlyArray<MetricSeriesItem>,
  days: number,
  metric: MetricType,
  activePercentiles: ReadonlySet<PercentileKey>,
) {
  const chartData = useMemo(
    () => buildChartData(series, days, metric),
    [days, metric, series],
  );
  const yAxisMax = useMemo(
    () => getYAxisMax(chartData, activePercentiles, metric),
    [activePercentiles, chartData, metric],
  );
  const yAxisDomain = useMemo(() => [0, yAxisMax], [yAxisMax]);
  const yAxisTicks = useMemo(
    () => getYAxisTicks(metric, yAxisMax),
    [metric, yAxisMax],
  );
  const gridLines = useMemo(() => getGridLines(yAxisTicks), [yAxisTicks]);
  const lastDataIndex = useMemo(() => getLastDataIndex(chartData), [chartData]);

  return { chartData, gridLines, lastDataIndex, yAxisDomain, yAxisTicks };
}
