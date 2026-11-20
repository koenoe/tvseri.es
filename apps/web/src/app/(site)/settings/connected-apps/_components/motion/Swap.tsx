'use client';

import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { type ReactNode, useState } from 'react';
import { SWAP_FROM, SWAP_IN, SWAP_OUT } from '@/components/motion/swap';
import cn from '@/lib/cn';

/**
 * The swap's labels: a part inside (the status dot) that takes its own
 * values under the same names moves with the swap.
 */
const SWAP_VARIANTS = {
  from: SWAP_FROM,
  in: SWAP_IN,
  out: SWAP_OUT,
} as const;

/** Both in one grid cell, so the one leaving fades out where it stood */
const STACK = 'grid grid-cols-[minmax(0,1fr)]';
const CELL = 'col-start-1 row-start-1';

/** The one leaving is out of reach while it fades: no press, no reading */
function Leaving({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const leaving = !useIsPresent();
  const classes = cn(CELL, className);
  return (
    <m.div
      animate="in"
      aria-hidden={leaving || undefined}
      className={classes}
      exit="out"
      inert={leaving}
      initial="from"
      variants={SWAP_VARIANTS}
    >
      {children}
    </m.div>
  );
}

/**
 * Whether `key` has changed since the first render: only a change plays
 * (state adjusted while rendering, React's pattern for it, so no effect)
 */
function useSwapped(key: string): boolean {
  const [seen, setSeen] = useState({ key, swapped: false });
  if (seen.key !== key) {
    setSeen({ key, swapped: true });
  }
  return seen.swapped || seen.key !== key;
}

/**
 * One thing replacing another in place when `swapKey` changes: the new one
 * rises 6px and fades in (200ms). `stacked`: the old one fades out (120ms)
 * in the same grid cell, for a line that keeps its height. Otherwise it
 * leaves at once, so a taller body never holds the card open or takes a
 * press. Nothing plays on the first render: arriving is the header's
 * (`SWAP_ARRIVE`).
 */
export default function Swap({
  children,
  className,
  stacked = false,
  swapKey,
}: Readonly<{
  children: ReactNode;
  /** The item's own layout (it replaces the wrapper the content would have) */
  className?: string;
  stacked?: boolean;
  swapKey: string;
}>) {
  const swapped = useSwapped(swapKey);
  if (stacked) {
    return (
      <div className={STACK}>
        <AnimatePresence initial={false}>
          <Leaving className={className} key={swapKey}>
            {children}
          </Leaving>
        </AnimatePresence>
      </div>
    );
  }
  return (
    <m.div
      animate="in"
      className={className}
      initial={swapped ? 'from' : false}
      key={swapKey}
      variants={SWAP_VARIANTS}
    >
      {children}
    </m.div>
  );
}
