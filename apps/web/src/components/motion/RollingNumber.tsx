'use client';

import { formatGrouped } from '@tvseri.es/utils';
import { useEffect, useRef, useState } from 'react';

import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

/** A count rolls to its new value in 400ms, easing out */
const ROLL_MS = 400;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

/**
 * A count that rolls from the number it showed to a new one (a running
 * sync's counts at each poll), in equal-width digits so the line doesn't
 * jitter. It writes its own text frame by frame, never re-rendering; React
 * draws only the first value. Hidden from screen readers: the caller says
 * the number in words once it settles. With reduced motion it jumps.
 * `from`: mounted for the change itself (a moment that plays once, keyed),
 * it draws that number first and rolls from it.
 */
export default function RollingNumber({
  from,
  value,
}: Readonly<{ from?: number; value: number }>) {
  const ref = useRef<HTMLSpanElement>(null);
  const [first] = useState(from ?? value);
  const shown = useRef(first);

  // A frame loop is a subscription to the clock: an effect is the way
  useEffect(() => {
    const element = ref.current;
    const from = shown.current;
    if (!element || from === value) {
      return;
    }
    const draw = (count: number) => {
      shown.current = count;
      element.textContent = formatGrouped(count);
    };
    if (matchesNow(REDUCED_MOTION)) {
      draw(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / ROLL_MS);
      draw(Math.round(from + (value - from) * easeOut(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    // A newer value starts its roll from wherever this one got to
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span aria-hidden="true" className="tabular-nums" ref={ref}>
      {formatGrouped(first)}
    </span>
  );
}
