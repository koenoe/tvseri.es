'use client';

import type { Variants } from 'motion/react';
import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { type Key, type ReactNode, useLayoutEffect, useRef } from 'react';

import cn from '@/lib/cn';

import { CROSS_FADE_LAYER, handOverFocus } from './crossFadeFocus';
import { SWAP_VARIANTS } from './swap';

/** Both in one grid cell, so the one leaving fades out where it stood */
const STACK = 'grid grid-cols-[minmax(0,1fr)]';
const CELL = 'col-start-1 row-start-1';

/** The one leaving is out of reach while it fades: no press, no reading */
function Layer({
  children,
  className,
  variants,
}: Readonly<{
  children: ReactNode;
  className?: string;
  variants: Variants;
}>) {
  const leaving = !useIsPresent();
  const ref = useRef<HTMLDivElement>(null);
  // Focus held in it moves to the same control in the new copy (an
  // overlay giving focus back later finds it through `returnFocusToCopy`).
  // Before paint, in the commit that makes it inert
  useLayoutEffect(() => {
    if (leaving) {
      handOverFocus(ref.current);
    }
  }, [leaving]);
  const classes = cn(CELL, className);
  const layer = { [CROSS_FADE_LAYER]: '' };
  return (
    <m.div
      {...layer}
      animate="in"
      aria-hidden={leaving || undefined}
      className={classes}
      exit="out"
      inert={leaving}
      initial="from"
      ref={ref}
      variants={variants}
    >
      {children}
    </m.div>
  );
}

/**
 * One thing replacing another in place when `swapKey` changes (a card's
 * status line, Home's pick, path and pair): the new one rises 6px and fades
 * in (200ms) while the old fades out (120ms) in the same grid cell, so the
 * place keeps its size. Focus in the leaving copy moves to the same control
 * in the new one. Nothing plays on the first render. Not a live region:
 * keep one that stays mounted beside it. Text that follows its picture
 * (a deck's words) takes the text arrival's pace instead
 * (`TEXT_ARRIVAL_VARIANTS`).
 *
 * @example
 * <CrossFade swapKey={state}>{line}</CrossFade>
 * <CrossFade className={CHAIN} frame={CHAIN_SLOT} swapKey={index}>…</CrossFade>
 */
export default function CrossFade({
  children,
  className,
  frame,
  swapKey,
  variants = SWAP_VARIANTS,
}: Readonly<{
  children: ReactNode;
  /** Each layer's own layout (it replaces the wrapper the content would have) */
  className?: string;
  /** The cell's own place in its parent (a slot, a flex share) */
  frame?: string;
  swapKey: Key;
  /** `from`, `in` and `out`: the swap's (`swap.ts`) unless given */
  variants?: Variants;
}>) {
  const stack = cn(STACK, frame);
  return (
    <div className={stack}>
      <AnimatePresence initial={false}>
        <Layer className={className} key={swapKey} variants={variants}>
          {children}
        </Layer>
      </AnimatePresence>
    </div>
  );
}
