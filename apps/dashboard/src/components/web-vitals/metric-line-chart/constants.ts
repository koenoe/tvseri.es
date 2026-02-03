import type { ChartConfig } from '@/components/ui/chart';

export type PercentileKey = 'p75' | 'p90' | 'p95' | 'p99';

export const PERCENTILES: ReadonlyArray<{
  key: PercentileKey;
  label: string;
}> = [
  { key: 'p75', label: 'P75' },
  { key: 'p90', label: 'P90' },
  { key: 'p95', label: 'P95' },
  { key: 'p99', label: 'P99' },
];

// Use the same blue-500 color for all percentile lines
export const BLUE_500 = 'rgb(59, 130, 246)';

export const CHART_CONFIG: ChartConfig = {
  p75: { color: BLUE_500, label: 'P75' },
  p90: { color: BLUE_500, label: 'P90' },
  p95: { color: BLUE_500, label: 'P95' },
  p99: { color: BLUE_500, label: 'P99' },
};

export type ChartDataPoint = Readonly<{
  date: string;
  formattedDate: string;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  pageviews: number;
}>;
