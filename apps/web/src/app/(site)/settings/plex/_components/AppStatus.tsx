import type { ReactNode } from 'react';

import cn from '@/lib/cn';

export type StatusDot = 'none' | 'paused' | 'receiving' | 'wait';

const DOT: Readonly<Record<StatusDot, string>> = {
  // hollow
  none: 'border-[1.5px] border-white/50 rounded-full',
  // a stop square
  paused: 'rounded-2 bg-white/45',
  // solid amber (the connected panel's accent)
  receiving: 'rounded-full bg-[#e5a00d]',
  // dashed ring
  wait: 'rounded-full border-[1.5px] border-white/50 border-dashed',
};

/**
 * The status line under a card's name: a small mark
 * (hollow = not connected, dashed = waiting, solid = receiving, square =
 * paused) and one line of text. The mark is decoration: the text says it.
 */
export default function AppStatus({
  children,
  dot = 'none',
  strong = false,
}: Readonly<{
  children: ReactNode;
  dot?: StatusDot;
  /** White text while receiving. */
  strong?: boolean;
}>) {
  const dotClasses = cn('mt-1.25 size-2 shrink-0 box-border', DOT[dot]);
  const classes = cn(
    'flex items-start gap-2 text-meta',
    strong ? 'text-white' : 'text-white/60',
  );
  return (
    <span className={classes}>
      <span aria-hidden="true" className={dotClasses} />
      <span>{children}</span>
    </span>
  );
}
