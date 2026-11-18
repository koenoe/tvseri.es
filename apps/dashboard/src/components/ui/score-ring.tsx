import { memo } from 'react';

import { cn } from '@/lib/utils';
import { getMetricHslColor } from '@/lib/web-vitals';

type ScoreRingProps = Readonly<{
  className?: string;
  /** Shown inside the ring instead of the score. */
  label?: string;
  score: number;
  showLabel?: boolean;
  size?: number;
}>;

const VIEW_BOX_SIZE = 100;
const STROKE_WIDTH = 10;
const RADIUS = (VIEW_BOX_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = VIEW_BOX_SIZE / 2;
// A visible gap, so a score like 98 doesn't look like 100
const MIN_GAP = CIRCUMFERENCE * 0.05;

function ScoreRingComponent({
  className,
  label,
  score,
  showLabel = true,
  size = 64,
}: ScoreRingProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const progressLength = (clampedScore / 100) * CIRCUMFERENCE;
  const adjustedProgress =
    clampedScore < 100
      ? Math.min(progressLength, CIRCUMFERENCE - MIN_GAP)
      : CIRCUMFERENCE;
  const strokeDashoffset = CIRCUMFERENCE - adjustedProgress;
  const scoreColor = getMetricHslColor('res', clampedScore);

  const classes = cn('shrink-0', className);
  return (
    <svg
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clampedScore}
      className={classes}
      height={size}
      role="progressbar"
      style={{ minHeight: size, minWidth: size }}
      viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      width={size}
    >
      <circle
        className="stroke-muted"
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={RADIUS}
        strokeWidth={STROKE_WIDTH}
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={RADIUS}
        stroke={scoreColor}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeWidth={STROKE_WIDTH}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
      {showLabel ? (
        <text
          className="fill-foreground font-medium"
          dominantBaseline="central"
          style={{ fontSize: '1.75rem' }}
          textAnchor="middle"
          x={CENTER}
          y={CENTER}
        >
          {label ?? clampedScore}
        </text>
      ) : null}
    </svg>
  );
}

ScoreRingComponent.displayName = 'ScoreRing';

export const ScoreRing = memo(ScoreRingComponent);
