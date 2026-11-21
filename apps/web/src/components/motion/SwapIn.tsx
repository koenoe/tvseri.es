'use client';

import * as m from 'motion/react-m';
import { type Key, type ReactNode, useState } from 'react';

import { SWAP_VARIANTS } from './swap';

/**
 * Whether `key` has changed since the first render: only a change plays
 * (state adjusted while rendering, React's pattern for it, so no effect)
 */
function useSwapped(key: Key): boolean {
  const [seen, setSeen] = useState({ key, swapped: false });
  if (seen.key !== key) {
    setSeen({ key, swapped: true });
  }
  return seen.swapped || seen.key !== key;
}

/**
 * A body replacing another when `swapKey` changes (a card's pairing steps,
 * its connected body): the new one rises 6px and fades in (200ms) while the
 * old leaves at once, so a taller body never holds the card open or takes
 * a press. Nothing plays on the first render: arriving is the header's
 * (`SWAP_ARRIVE`). For a line that keeps its height, `CrossFade`.
 */
export default function SwapIn({
  children,
  className,
  swapKey,
}: Readonly<{
  children: ReactNode;
  /** The item's own layout (it replaces the wrapper the content would have) */
  className?: string;
  swapKey: Key;
}>) {
  const swapped = useSwapped(swapKey);
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
