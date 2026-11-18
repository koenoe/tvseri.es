import { memo, useMemo } from 'react';

import type { StatusColor } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

type SegmentedBarProps = Readonly<{
  barCount: number;
  color: StatusColor;
  filledBars: number;
  height?: string;
  width?: string;
}>;

const COLOR_VALUES: Record<StatusColor, string> = {
  amber: 'rgb(245 158 11)',
  green: 'rgb(34 197 94)',
  red: 'rgb(239 68 68)',
};

function generateOpacities(count: number): ReadonlyArray<number> {
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return 1;
    const progress = i / (count - 1);
    return 1 - progress * progress * 0.77;
  });
}

const BAR_CLASSES = 'h-full flex-1 rounded-full';
const EMPTY_BAR_CLASSES = 'h-full flex-1 rounded-full bg-muted/30';

const OPACITY_CACHE = new Map<number, ReadonlyArray<number>>();

function getOpacities(count: number): ReadonlyArray<number> {
  let opacities = OPACITY_CACHE.get(count);

  if (!opacities) {
    opacities = generateOpacities(count);
    OPACITY_CACHE.set(count, opacities);
  }

  return opacities;
}

const SegmentedBar = memo(function SegmentedBar({
  barCount,
  color,
  filledBars,
  height = 'h-8',
  width = 'w-full max-w-60',
}: SegmentedBarProps) {
  const opacities = getOpacities(barCount);
  const colorValue = COLOR_VALUES[color];

  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      const isFilled = i < filledBars;
      const style = isFilled
        ? { backgroundColor: colorValue, opacity: opacities[i] }
        : undefined;

      return (
        <div
          className={isFilled ? BAR_CLASSES : EMPTY_BAR_CLASSES}
          key={i}
          style={style}
        />
      );
    });
  }, [barCount, colorValue, filledBars, opacities]);

  const classes = cn('flex gap-0.5', height, width);
  return <div className={classes}>{bars}</div>;
});

SegmentedBar.displayName = 'SegmentedBar';

export { SegmentedBar };
