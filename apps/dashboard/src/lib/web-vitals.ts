import {
  CircleAlert,
  CircleCheck,
  CircleMinus,
  type LucideIcon,
} from 'lucide-react';

import { STATUS_COLORS } from './status-colors';

export type RatingStatus = 'great' | 'needsImprovement' | 'poor';

export type StatusConfig = Readonly<{
  Icon: LucideIcon;
  label: string;
  text: string;
  threshold: string;
}>;

export const DEFAULT_EMPTY_MESSAGES: Record<RatingStatus, string> = {
  great: 'No great scores',
  needsImprovement: 'No needs improvement scores',
  poor: 'No poor scores',
};

export const COLUMN_PADDING: Record<RatingStatus, string> = {
  great: 'pl-6',
  needsImprovement: 'px-6',
  poor: 'pr-6',
};

export const RATING_COLORS = {
  great: STATUS_COLORS.green,
  needsImprovement: STATUS_COLORS.amber,
  poor: STATUS_COLORS.red,
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
  description: string;
  label: string;
  learnMoreUrl: string;
  lowerIsBetter: boolean;
  name: string;
  thresholdGreat: number;
  thresholdPoor: number;
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
    if (value <= config.thresholdGreat) return 'great';
    if (value <= config.thresholdPoor) return 'needsImprovement';
    return 'poor';
  }
  if (value > config.thresholdGreat) return 'great';
  if (value >= config.thresholdPoor) return 'needsImprovement';
  return 'poor';
};

export const getMetricHslColor = (
  metric: MetricType,
  value: number,
): string => {
  const status = getMetricStatus(metric, value);
  return RATING_COLORS[status].hsl;
};

export const getMetricTextClass = (
  metric: MetricType,
  value: number,
): string => {
  const status = getMetricStatus(metric, value);
  return RATING_COLORS[status].text;
};

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
  return {
    great: `>${great}`,
    needsImprovement: `${poor} - ${great}`,
    poor: `<${poor}`,
  };
};

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
    ...RATING_COLORS[status],
    Icon: STATUS_ICONS[status],
    label: STATUS_LABELS[status],
    status,
    threshold: thresholds[status],
    thresholdLabel: readableThresholds[status],
  };
};

export const getRatingStatusConfig = (metric: MetricType) => {
  const thresholds = getMetricThresholdLabels(metric);
  const readableThresholds = getMetricThresholdReadableLabels(metric);

  return {
    great: {
      ...RATING_COLORS.great,
      Icon: STATUS_ICONS.great,
      label: STATUS_LABELS.great,
      threshold: thresholds.great,
      thresholdLabel: readableThresholds.great,
    },
    needsImprovement: {
      ...RATING_COLORS.needsImprovement,
      Icon: STATUS_ICONS.needsImprovement,
      label: STATUS_LABELS.needsImprovement,
      threshold: thresholds.needsImprovement,
      thresholdLabel: readableThresholds.needsImprovement,
    },
    poor: {
      ...RATING_COLORS.poor,
      Icon: STATUS_ICONS.poor,
      label: STATUS_LABELS.poor,
      threshold: thresholds.poor,
      thresholdLabel: readableThresholds.poor,
    },
  } as const;
};
