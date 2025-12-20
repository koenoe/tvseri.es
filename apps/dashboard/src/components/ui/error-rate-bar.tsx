import { memo } from 'react';

const BAR_COUNT = 8;
const MAX_ERROR_RATE = 10;

type ErrorRateBarProps = Readonly<{
  errorRate: number;
}>;

const GREEN_SHADES = [
  'bg-green-500',
  'bg-green-500/90',
  'bg-green-500/80',
  'bg-green-500/70',
  'bg-green-500/60',
  'bg-green-500/50',
  'bg-green-500/40',
  'bg-green-500/30',
];

const AMBER_SHADES = [
  'bg-amber-500',
  'bg-amber-500/90',
  'bg-amber-500/80',
  'bg-amber-500/70',
  'bg-amber-500/60',
  'bg-amber-500/50',
  'bg-amber-500/40',
  'bg-amber-500/30',
];

const RED_SHADES = [
  'bg-red-500',
  'bg-red-500/90',
  'bg-red-500/80',
  'bg-red-500/70',
  'bg-red-500/60',
  'bg-red-500/50',
  'bg-red-500/40',
  'bg-red-500/30',
];

function getShades(errorRate: number) {
  if (errorRate < 1) return GREEN_SHADES;
  if (errorRate < 5) return AMBER_SHADES;
  return RED_SHADES;
}

const ErrorRateBar = memo(function ErrorRateBar({
  errorRate,
}: ErrorRateBarProps) {
  const shades = getShades(errorRate);
  const filledBars = Math.round(
    (Math.min(errorRate, MAX_ERROR_RATE) / MAX_ERROR_RATE) * BAR_COUNT,
  );

  return (
    <div className="flex gap-0.5 h-3 w-12">
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const isFilled = i < filledBars;
        return (
          <div
            className={`h-full w-px ${isFilled ? shades[i] : 'bg-muted/30'}`}
            key={i}
          />
        );
      })}
    </div>
  );
});

ErrorRateBar.displayName = 'ErrorRateBar';

export { ErrorRateBar };
