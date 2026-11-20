'use client';

import { useIsPresent, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';

import cn from '@/lib/cn';

import {
  FOLD_OPEN,
  FOLD_OPEN_TIMING,
  FOLD_SHUT,
  FOLD_SHUT_TIMING,
  FOLD_SNAP,
} from './fold';

const FOLD_EXIT = { ...FOLD_SHUT, transition: FOLD_SHUT_TIMING } as const;
const SNAP_EXIT = { ...FOLD_SHUT, transition: FOLD_SNAP } as const;

/**
 * A part that folds into the flow when it appears and out when it goes
 * (the fold of `fold.ts`), as a child of an `AnimatePresence` (whose
 * `initial={false}` keeps what the first render draws still). It clips
 * only while it leaves, so a focus ring at rest is never cut; a caller
 * whose part also arrives clips it for good (`overflow-hidden`). With
 * reduced motion it snaps.
 */
export default function FoldPresence({
  as = 'div',
  children,
  className,
}: Readonly<{
  /** `span` inside phrasing content (a line of text); drawn as a block */
  as?: 'div' | 'span';
  children: ReactNode;
  className?: string;
}>) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const timing = reduced ? FOLD_SNAP : FOLD_OPEN_TIMING;
  const exit = reduced ? SNAP_EXIT : FOLD_EXIT;
  const classes = cn('block', !present && 'overflow-hidden', className);
  const Fold = as === 'span' ? m.span : m.div;
  return (
    <Fold
      animate={FOLD_OPEN}
      className={classes}
      exit={exit}
      inert={!present}
      initial={FOLD_SHUT}
      transition={timing}
    >
      {children}
    </Fold>
  );
}
