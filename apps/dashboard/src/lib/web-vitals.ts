import { CircleAlert, CircleCheck, CircleMinus } from 'lucide-react';

/**
 * Web Vitals metrics configuration
 * Each metric has different thresholds for good/needs-improvement/poor
 */

export type RatingStatus = 'great' | 'needsImprovement' | 'poor';

export const STATUS_COLORS = {
  great: {
    bg: 'bg-green-500',
    // Matches Tailwind green-500
    hsl: 'hsl(142, 71%, 45%)',
    text: 'text-green-500',
  },
  needsImprovement: {
    bg: 'bg-amber-500',
    // Matches Tailwind amber-500
    hsl: 'hsl(38, 92%, 50%)',
    text: 'text-amber-500',
  },
  poor: {
    bg: 'bg-red-500',
    // Matches Tailwind red-500
    hsl: 'hsl(0, 72%, 51%)',
    text: 'text-red-500',
  },
} as const;

export const STATUS_ICONS = {
  great: CircleCheck,
  needsImprovement: CircleMinus,
  poor: CircleAlert,
} as const;

export const STATUS_LABELS = {
  great: 'Great',
  needsImprovement: 'Needs Improvement',
  poor: 'Poor',
} as const;

export type MetricType = 'cls' | 'fcp' | 'inp' | 'lcp' | 'res' | 'ttfb';

type MetricConfig = Readonly<{
  // Description of what this metric measures
  description: string;
  // Full name of the metric
  label: string;
  // URL to learn more about this metric
  learnMoreUrl: string;
  // Lower is better (like time-based metrics) or higher is better (like RES)
  lowerIsBetter: boolean;
  // Short name/abbreviation
  name: string;
  // Threshold between great and needs-improvement
  thresholdGreat: number;
  // Threshold between needs-improvement and poor
  thresholdPoor: number;
  // Unit for display (s, ms, or empty for unitless)
  unit: '' | 'ms' | 's';
}>;

export const METRICS_CONFIG: Record<MetricType, MetricConfig> = {
  cls: {
    description:
      'Measures visual stability. To provide a good user experience, pages should maintain a CLS of less than 0.1.',
    label: 'Cumulative Layout Shift',
    learnMoreUrl: 'https://web.dev/articles/cls',
    lowerIsBetter: true,
    name: 'CLS',
    thresholdGreat: 0.1,
    thresholdPoor: 0.25,
    unit: '',
  },
  fcp: {
    description:
      'When the browser renders the first bit of content from the DOM, providing the first feedback to the user that the page is actually loading.',
    label: 'First Contentful Paint',
    learnMoreUrl: 'https://web.dev/articles/fcp',
    lowerIsBetter: true,
    name: 'FCP',
    thresholdGreat: 1.8,
    thresholdPoor: 3.0,
    unit: 's',
  },
  inp: {
    description:
      'Measures interactivity. To provide a good user experience, pages should have an input delay of less than 200ms.',
    label: 'Interaction to Next Paint',
    learnMoreUrl: 'https://web.dev/articles/inp',
    lowerIsBetter: true,
    name: 'INP',
    thresholdGreat: 200,
    thresholdPoor: 500,
    unit: 'ms',
  },
  lcp: {
    description:
      'Measures loading performance. To provide a good user experience, LCP should occur within 2.5s of when the page first starts loading.',
    label: 'Largest Contentful Paint',
    learnMoreUrl: 'https://web.dev/articles/lcp',
    lowerIsBetter: true,
    name: 'LCP',
    thresholdGreat: 2.5,
    thresholdPoor: 4.0,
    unit: 's',
  },
  res: {
    description:
      'Measures the overall user experience. To provide a good user experience, pages should have a RES of more than 90.',
    label: 'Real Experience Score',
    learnMoreUrl:
      'https://vercel.com/docs/speed-insights/metrics#real-experience-score-res',
    lowerIsBetter: false,
    name: 'RES',
    thresholdGreat: 90,
    thresholdPoor: 50,
    unit: '',
  },
  ttfb: {
    description:
      'Measures server latency. To provide a good user experience, TTFB should be less than 0.8s.',
    label: 'Time to First Byte',
    learnMoreUrl: 'https://web.dev/articles/ttfb',
    lowerIsBetter: true,
    name: 'TTFB',
    thresholdGreat: 0.8,
    thresholdPoor: 1.8,
    unit: 's',
  },
} as const;

export const getMetricStatus = (
  metric: MetricType,
  value: number,
): RatingStatus => {
  const config = METRICS_CONFIG[metric];

  if (config.lowerIsBetter) {
    // Lower is better (time-based metrics)
    if (value <= config.thresholdGreat) return 'great';
    if (value <= config.thresholdPoor) return 'needsImprovement';
    return 'poor';
  }
  // Higher is better (RES)
  if (value > config.thresholdGreat) return 'great';
  if (value >= config.thresholdPoor) return 'needsImprovement';
  return 'poor';
};

export const getMetricHslColor = (
  metric: MetricType,
  value: number,
): string => {
  const status = getMetricStatus(metric, value);
  return STATUS_COLORS[status].hsl;
};

export const getMetricTextClass = (
  metric: MetricType,
  value: number,
): string => {
  const status = getMetricStatus(metric, value);
  return STATUS_COLORS[status].text;
};

/**
 * Format a threshold value with its unit for display.
 */
const formatThreshold = (value: number, unit: '' | 'ms' | 's'): string => {
  return `${value}${unit}`;
};

export const getMetricThresholdLabels = (metric: MetricType) => {
  const config = METRICS_CONFIG[metric];
  const unit = config.unit;
  const great = formatThreshold(config.thresholdGreat, unit);
  const poor = formatThreshold(config.thresholdPoor, unit);

  if (config.lowerIsBetter) {
    return {
      great: `<${great}`,
      needsImprovement: `${great} - ${poor}`,
      poor: `>${poor}`,
    };
  }
  // Higher is better (RES)
  return {
    great: `>${great}`,
    needsImprovement: `${poor} - ${great}`,
    poor: `<${poor}`,
  };
};

/**
 * Get human-readable threshold labels for display.
 * e.g., "Below 100ms", "Above 200ms", "Above 3s"
 */
export const getMetricThresholdReadableLabels = (metric: MetricType) => {
  const config = METRICS_CONFIG[metric];
  const unit = config.unit;
  const great = formatThreshold(config.thresholdGreat, unit);
  const poor = formatThreshold(config.thresholdPoor, unit);

  if (config.lowerIsBetter) {
    return {
      great: `Below ${great}`,
      needsImprovement: `Above ${great}`,
      poor: `Above ${poor}`,
    };
  }
  // Higher is better (RES)
  return {
    great: `Above ${great}`,
    needsImprovement: `Below ${great}`,
    poor: `Below ${poor}`,
  };
};

export const getMetricStatusConfig = (metric: MetricType, value: number) => {
  const status = getMetricStatus(metric, value);
  const thresholds = getMetricThresholdLabels(metric);
  const readableThresholds = getMetricThresholdReadableLabels(metric);

  return {
    ...STATUS_COLORS[status],
    Icon: STATUS_ICONS[status],
    label: STATUS_LABELS[status],
    status,
    threshold: thresholds[status],
    thresholdLabel: readableThresholds[status],
  };
};

/**
 * Static config for all three rating statuses
 * Useful for rendering all categories (poor/needs-improvement/great)
 */
export const getRatingStatusConfig = (metric: MetricType) => {
  const thresholds = getMetricThresholdLabels(metric);
  const readableThresholds = getMetricThresholdReadableLabels(metric);

  return {
    great: {
      ...STATUS_COLORS.great,
      Icon: STATUS_ICONS.great,
      label: STATUS_LABELS.great,
      threshold: thresholds.great,
      thresholdLabel: readableThresholds.great,
    },
    needsImprovement: {
      ...STATUS_COLORS.needsImprovement,
      Icon: STATUS_ICONS.needsImprovement,
      label: STATUS_LABELS.needsImprovement,
      threshold: thresholds.needsImprovement,
      thresholdLabel: readableThresholds.needsImprovement,
    },
    poor: {
      ...STATUS_COLORS.poor,
      Icon: STATUS_ICONS.poor,
      label: STATUS_LABELS.poor,
      threshold: thresholds.poor,
      thresholdLabel: readableThresholds.poor,
    },
  } as const;
};
