'use client';

import { useIsPresent, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { type ReactNode, useMemo } from 'react';

import { leaveFold } from '@/components/motion/fold';

/** A Skip all's items leave 30ms apart, the ninth on with the eighth */
const SWEEP_STEP = 0.03;
const SWEEP_CAP = 8;

const HERE = { height: 'auto', opacity: 1, y: 0 } as const;

/**
 * A review item inside its group's `AnimatePresence`: a fixed or skipped
 * item fades and lifts, then its gap shuts (`leaveFold`). The presence's
 * `custom` says whether a Skip all swept the group, so its items leave one
 * after another. While it leaves it takes no press. Nothing moves on the
 * first render or for an item a page adds.
 */
export default function LeavingItem({
  children,
  index,
}: Readonly<{ children: ReactNode; index: number }>) {
  const present = useIsPresent();
  const reduced = useReducedMotion() ?? false;
  const variants = useMemo(
    () => ({
      gone: (swept: boolean) =>
        leaveFold(swept ? Math.min(index, SWEEP_CAP) * SWEEP_STEP : 0, reduced),
      here: HERE,
    }),
    [index, reduced],
  );
  const clip = present ? undefined : 'overflow-hidden';
  return (
    <m.div
      animate="here"
      className={clip}
      custom={false}
      exit="gone"
      inert={!present}
      variants={variants}
    >
      {children}
    </m.div>
  );
}
