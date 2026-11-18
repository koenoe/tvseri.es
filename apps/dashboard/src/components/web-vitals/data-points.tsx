import type { ReactNode } from 'react';

import { formatCountString } from '@/lib/api-metrics';
import { cn } from '@/lib/utils';
import { RATING_COLORS, type RatingStatus } from '@/lib/web-vitals';

/** One dot under 50 page views, two up to 100, three above. */
export function getDotsCount(pageViews: number): 1 | 2 | 3 {
  if (pageViews > 100) return 3;
  if (pageViews >= 50) return 2;
  return 1;
}

// Fewer dots means less data behind the number, so less confidence in it.
const CONFIDENCE_COLORS = {
  1: 'text-red-500',
  2: 'text-amber-500',
  3: 'text-green-500',
} as const;

export function DataPointDots({
  className = 'size-4',
  count,
}: Readonly<{ className?: string; count: 1 | 2 | 3 }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <circle cx="10" cy="8" r="2" />
      {count >= 2 ? <circle cx="5" cy="11" r="2" /> : null}
      {count >= 3 ? <circle cx="5" cy="5" r="2" /> : null}
    </svg>
  );
}

DataPointDots.displayName = 'DataPointDots';

/** The "Data points" bubble under the chart and map tooltips. */
export function DataPointsBubble({
  pageViews,
}: Readonly<{ pageViews: number }>) {
  const count = getDotsCount(pageViews);
  const classes = cn('flex items-center gap-0.5', CONFIDENCE_COLORS[count]);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-black px-3 py-2 text-neutral-400 shadow-lg">
      <span>Data points</span>
      <span className={classes}>
        {formatCountString(pageViews)}
        <DataPointDots count={count} />
      </span>
    </div>
  );
}

DataPointsBubble.displayName = 'DataPointsBubble';

/** A value outlined in its rating's colour. */
export function RatingPill({
  children,
  status,
}: Readonly<{ children: ReactNode; status: RatingStatus }>) {
  const colors = RATING_COLORS[status];
  const classes = cn('rounded px-1.5 py-0.5 text-xs font-medium', colors.text);
  const style = { border: `1px solid ${colors.hsl}` };
  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}

RatingPill.displayName = 'RatingPill';

export function DataPointsFooter({ count }: Readonly<{ count: number }>) {
  return (
    <div className="flex flex-col items-center gap-2 border-t border-border pt-4 text-center lg:flex-row lg:justify-between lg:text-left">
      <span className="text-sm text-muted-foreground/70">
        This report is based on{' '}
        <DataPointDots
          className="inline size-3.5 text-muted-foreground/70"
          count={3}
        />{' '}
        {count.toLocaleString()} data points
      </span>
      <span className="text-sm text-muted-foreground/70">
        Updated once a day
      </span>
    </div>
  );
}

DataPointsFooter.displayName = 'DataPointsFooter';
