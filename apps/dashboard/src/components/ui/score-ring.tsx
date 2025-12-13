import { memo } from 'react';

import { cn } from '@/lib/utils';
import { getMetricHslColor } from '@/lib/web-vitals';

type ScoreRingProps = Readonly<{
  className?: string;
  score: number;
  showLabel?: boolean;
  size?: number;
}>;

const VIEW_BOX_SIZE = 100;
const STROKE_WIDTH = 10;
const RADIUS = (VIEW_BOX_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = VIEW_BOX_SIZE / 2;
// Minimum visible gap (in circumference units) so scores like 98 don't look like 100
const MIN_GAP = CIRCUMFERENCE * 0.05;

function ScoreRingComponent({
  className,
  score,
  showLabel = true,
  size = 64,
}: ScoreRingProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const progressLength = (clampedScore / 100) * CIRCUMFERENCE;
  // Ensure a visible gap for any score < 100
  const adjustedProgress =
    clampedScore < 100
      ? Math.min(progressLength, CIRCUMFERENCE - MIN_GAP)
      : CIRCUMFERENCE;
  const strokeDashoffset = CIRCUMFERENCE - adjustedProgress;
  const scoreColor = getMetricHslColor('res', clampedScore);

  return (
    <svg
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clampedScore}
      className={cn('shrink-0', className)}
      height={size}
      role="progressbar"
      style={{ minHeight: size, minWidth: size }}
      viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      width={size}
    >
      {/* Background circle */}
      <circle
        className="stroke-muted"
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={RADIUS}
        strokeWidth={STROKE_WIDTH}
      />
      {/* Progress circle */}
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
      {/* Score label */}
      {showLabel && (
        <text
          className="fill-foreground font-medium"
          dominantBaseline="central"
          style={{ fontSize: '1.75rem' }}
          textAnchor="middle"
          x={CENTER}
          y={CENTER}
        >
          {clampedScore}
        </text>
      )}
    </svg>
  );
}

ScoreRingComponent.displayName = 'ScoreRing';

export const ScoreRing = memo(ScoreRingComponent);
