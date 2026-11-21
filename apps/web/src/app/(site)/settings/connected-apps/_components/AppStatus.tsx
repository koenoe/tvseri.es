import type { ReactNode } from 'react';

import cn from '@/lib/cn';
import { type AppBrand, brandOf } from '../../_lib/services';
import type { StatusDot } from '../_lib/appState';
import PopDot from './motion/PopDot';

const DOT: Readonly<Record<Exclude<StatusDot, 'receiving'>, string>> = {
  // a short bar, centred in the dot's box: can't connect here
  dash: 'bg-[linear-gradient(rgb(255_255_255/0.5),rgb(255_255_255/0.5))] bg-center bg-no-repeat bg-size-[100%_2px]',
  // hollow
  none: 'border-[1.5px] border-white/50 rounded-full',
  // a stop square
  paused: 'rounded-2 bg-white/45',
  // dashed ring
  wait: 'rounded-full border-[1.5px] border-white/50 border-dashed',
};

/**
 * The status line under a card's name: a small mark and one line of text.
 * The mark is decoration; the text carries the meaning. Inside a `CrossFade`
 * the mark pops in with a new state.
 */
export default function AppStatus({
  brand = 'plex',
  children,
  dot = 'none',
  strong = false,
}: Readonly<{
  /** The colour a receiving dot fills with */
  brand?: AppBrand;
  children: ReactNode;
  dot?: StatusDot;
  /** White text while receiving. */
  strong?: boolean;
}>) {
  // The solid dot: round, in the connected panel's brand accent
  const mark = dot === 'receiving' ? brandOf(brand).dot : DOT[dot];
  const dotClasses = cn('mt-1.25 size-2 shrink-0 box-border', mark);
  const classes = cn(
    'flex items-start gap-2 text-meta',
    strong ? 'text-white' : 'text-white/60',
  );
  return (
    <span className={classes}>
      <PopDot className={dotClasses} />
      <span>{children}</span>
    </span>
  );
}
