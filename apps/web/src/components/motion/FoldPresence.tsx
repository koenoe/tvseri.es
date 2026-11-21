'use client';

import { useIsPresent, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import cn from '@/lib/cn';

import {
  FOLD_OPEN,
  FOLD_OPEN_TIMING,
  FOLD_SHUT,
  FOLD_SHUT_TIMING,
  FOLD_SNAP,
} from './fold';

/** The part's own vertical margin and padding shut with it (`spacing`) */
const SPACING_SHUT = {
  marginBottom: 0,
  marginTop: 0,
  paddingBottom: 0,
  paddingTop: 0,
} as const;
const SPACING_TIMING = {
  marginBottom: FOLD_SHUT_TIMING.height,
  marginTop: FOLD_SHUT_TIMING.height,
  paddingBottom: FOLD_SHUT_TIMING.height,
  paddingTop: FOLD_SHUT_TIMING.height,
} as const;

const FOLD = { div: m.div, li: m.li, span: m.span } as const;

/** Its exit: folding shut (with its spacing too), or gone at once */
const shutOf = (spacing: boolean, folds: boolean) => ({
  ...FOLD_SHUT,
  ...(spacing ? SPACING_SHUT : undefined),
  transition: !folds
    ? FOLD_SNAP
    : spacing
      ? { ...FOLD_SHUT_TIMING, ...SPACING_TIMING }
      : FOLD_SHUT_TIMING,
});

/**
 * A part that folds into the flow when it appears and out when it goes
 * (the fold of `fold.ts`), as a child of an `AnimatePresence` (whose
 * `initial={false}` keeps what the first render draws still). It clips
 * only while it moves, folding open or shut, so at rest a focus ring or a
 * shadow is never cut. Opening starts at opacity 0, so the frame before
 * the clip is invisible. While it leaves it takes no press; `onLeave` gets
 * it as it starts, before paint, to move focus held in it. With reduced
 * motion it snaps. `whenAsked`: it folds shut only when its
 * `AnimatePresence`'s `custom` is true (the viewer's own act); any other
 * leave (an Undo, a switch) is at once.
 */
export default function FoldPresence({
  appear = true,
  as = 'div',
  children,
  className,
  onLeave,
  spacing = false,
  whenAsked = false,
}: Readonly<{
  /** false: it never folds in (it is drawn at once), only out */
  appear?: boolean;
  /** `span` inside phrasing content (a line of text), `li` in a list; drawn as a block */
  as?: 'div' | 'li' | 'span';
  children: ReactNode;
  className?: string;
  onLeave?: (part: HTMLElement) => void;
  /** Its own vertical margin and padding (`className`) shut with it */
  spacing?: boolean;
  /** It folds out only when the presence's `custom` is true */
  whenAsked?: boolean;
}>) {
  const present = useIsPresent();
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement | null>(null);
  const attach = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const [moving, setMoving] = useState(false);
  const start = () => setMoving(true);
  const settle = () => setMoving(false);
  // in the commit that makes it inert, before focus falls to the page
  useLayoutEffect(() => {
    if (!present && ref.current) {
      onLeave?.(ref.current);
    }
  }, [onLeave, present]);
  const timing = reduced ? FOLD_SNAP : FOLD_OPEN_TIMING;
  // by the presence's `custom` (a label resolves it), else one exit
  const exit = whenAsked ? 'shut' : shutOf(spacing, !reduced);
  const variants = whenAsked
    ? { shut: (asked?: boolean) => shutOf(spacing, asked === true && !reduced) }
    : undefined;
  const initial = appear ? FOLD_SHUT : false;
  const classes = cn(
    'block',
    (moving || !present) && 'overflow-hidden',
    className,
  );
  const Fold = FOLD[as];
  return (
    <Fold
      animate={FOLD_OPEN}
      className={classes}
      exit={exit}
      inert={!present}
      initial={initial}
      onAnimationComplete={settle}
      onAnimationStart={start}
      ref={attach}
      transition={timing}
      variants={variants}
    >
      {children}
    </Fold>
  );
}
