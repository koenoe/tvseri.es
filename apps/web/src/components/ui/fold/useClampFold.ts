'use client';

import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

import { FOLD_OPEN_TIMING, FOLD_SHUT_TIMING } from '@/components/motion/fold';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

/** Clamped and at rest, opening, open, or shutting (still whole) */
type Fold = 'folded' | 'opening' | 'open' | 'shutting';

/** The fold's height pace (`fold.ts`) for Web Animations */
const paceOf = (
  timing: Readonly<{ duration: number; ease: ReadonlyArray<number> }>,
) => ({
  duration: timing.duration * 1000,
  easing: `cubic-bezier(${timing.ease.join(', ')})`,
});

const OPEN_PACE = paceOf(FOLD_OPEN_TIMING.height);
// it holds its three lines until the clamp takes over in the same commit
const SHUT_PACE = {
  ...paceOf(FOLD_SHUT_TIMING.height),
  fill: 'forwards',
} as const;

const canMove = (box: HTMLElement) =>
  typeof box.animate === 'function' && !matchesNow(REDUCED_MOTION);

/**
 * A text box clamped to its lines that opens to its full height and shuts
 * back at the fold's pace (`fold.ts`): it stays whole while it shuts and
 * is clamped only once it has, so no line is cut early. A press while it
 * moves turns it back from where it is. With reduced motion it snaps.
 *
 * `clipped`: whether the clamp cuts the text (null until measured), again
 * whenever its width or the font changes, only while it is clamped.
 */
export default function useClampFold(ref: RefObject<HTMLElement | null>) {
  const [fold, setFold] = useState<Fold>('folded');
  const [clipped, setClipped] = useState<boolean | null>(null);
  /** The box's height at the press, where the motion starts */
  const from = useRef<number | null>(null);
  /** The clamped box's height, the shut motion's end */
  const clampedHeight = useRef(0);
  const clamped = fold === 'folded';

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !clamped) {
      return;
    }
    const measure = () => {
      clampedHeight.current = element.clientHeight;
      setClipped(element.scrollHeight > element.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // A late web font rewraps the text without resizing the clamped box
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [clamped, ref]);

  useLayoutEffect(() => {
    const box = ref.current;
    const start = from.current;
    from.current = null;
    if (!box || (fold !== 'opening' && fold !== 'shutting')) {
      return;
    }
    const opening = fold === 'opening';
    if (start === null) {
      // shown again mid-motion (a page Back brings from a hidden
      // `<Activity>`, whose hiding cancelled it): it lands where it was going
      setFold(opening ? 'open' : 'folded');
      return;
    }
    const end = opening ? box.scrollHeight : clampedHeight.current;
    const animation = box.animate(
      { height: [`${start}px`, `${end}px`] },
      opening ? OPEN_PACE : SHUT_PACE,
    );
    animation.onfinish = () => setFold(opening ? 'open' : 'folded');
    return () => animation.cancel();
  }, [fold, ref]);

  const open = fold === 'opening' || fold === 'open';
  const toggle = () => {
    const box = ref.current;
    const moves = box !== null && canMove(box);
    from.current = moves ? box.clientHeight : null;
    setFold(
      open ? (moves ? 'shutting' : 'folded') : moves ? 'opening' : 'open',
    );
  };

  return {
    clamped,
    clipped,
    /** clipped while it moves, so the text under it never spills */
    moving: fold === 'opening' || fold === 'shutting',
    open,
    toggle,
  };
}
