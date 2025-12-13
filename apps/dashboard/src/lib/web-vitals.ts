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
      'Measures visual stability. To provide a good user experience, pages should have a CLS of 0.1 or less.',
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
      'Measures loading performance. To provide a good user experience, pages should have an FCP of 1.8 seconds or less.',
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
      'Measures responsiveness. To provide a good user experience, pages should have an INP of 200 milliseconds or less.',
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
      'Measures loading performance. To provide a good user experience, pages should have an LCP of 2.5 seconds or less.',
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
      'https://developer.chrome.com/docs/crux/real-experience-score',
    lowerIsBetter: false,
    name: 'RES',
    thresholdGreat: 90,
    thresholdPoor: 50,
    unit: '',
  },
  ttfb: {
    description:
      'Measures server responsiveness. To provide a good user experience, pages should have a TTFB of 0.8 seconds or less.',
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

export const getMetricThresholdLabels = (metric: MetricType) => {
  const config = METRICS_CONFIG[metric];
  const unit = config.unit;

  if (config.lowerIsBetter) {
    return {
      great: `≤${config.thresholdGreat}${unit}`,
      needsImprovement: `${config.thresholdGreat}${unit} - ${config.thresholdPoor}${unit}`,
      poor: `>${config.thresholdPoor}${unit}`,
    };
  }
  // Higher is better (RES)
  return {
    great: `>${config.thresholdGreat}`,
    needsImprovement: `${config.thresholdPoor} - ${config.thresholdGreat}`,
    poor: `<${config.thresholdPoor}`,
  };
};

export const getMetricStatusConfig = (metric: MetricType, value: number) => {
  const status = getMetricStatus(metric, value);
  const thresholds = getMetricThresholdLabels(metric);

  return {
    ...STATUS_COLORS[status],
    Icon: STATUS_ICONS[status],
    label: STATUS_LABELS[status],
    status,
    threshold: thresholds[status],
  };
};

/**
 * Static config for all three rating statuses
 * Useful for rendering all categories (poor/needs-improvement/great)
 */
export const getRatingStatusConfig = (metric: MetricType) => {
  const thresholds = getMetricThresholdLabels(metric);

  return {
    great: {
      ...STATUS_COLORS.great,
      Icon: STATUS_ICONS.great,
      label: STATUS_LABELS.great,
      threshold: thresholds.great,
    },
    needsImprovement: {
      ...STATUS_COLORS.needsImprovement,
      Icon: STATUS_ICONS.needsImprovement,
      label: STATUS_LABELS.needsImprovement,
      threshold: thresholds.needsImprovement,
    },
    poor: {
      ...STATUS_COLORS.poor,
      Icon: STATUS_ICONS.poor,
      label: STATUS_LABELS.poor,
      threshold: thresholds.poor,
    },
  } as const;
};
