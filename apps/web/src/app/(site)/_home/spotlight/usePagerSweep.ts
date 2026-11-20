import { type RefObject, useLayoutEffect, useRef } from 'react';

import { GLIDE } from '@/components/motion/glide';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

/** A line's static fill (the countdown is the current line's other `<i>`) */
const FILL = '[data-line-fill]';

/** How much of a line a fill draws now (its scaleX): 1 when untransformed */
function drawnScale(fill: Element | null): number {
  if (!fill) {
    return 0;
  }
  const transform = getComputedStyle(fill).transform;
  const scale = /^matrix(?:3d)?\(([^,]+)/.exec(transform)?.[1];
  return scale === undefined ? 1 : Number.parseFloat(scale);
}

/** Each line's `<i>` (its static fill, or the countdown), in order */
const fillsOf = (group: Element) =>
  [...group.querySelectorAll<HTMLElement>('[data-index]')].map((line) =>
    line.querySelector('i'),
  );

type Change = Readonly<{ fill: HTMLElement; from: number; to: number }>;

/**
 * One front runs from where the old line was drawn to the pressed line in
 * the glide's time and curve: each line's share of the run is the share of
 * the distance it covers (a line half drawn takes half a line's time)
 */
function sweep(changes: ReadonlyArray<Change>): Animation[] {
  const total = changes.reduce((sum, c) => sum + Math.abs(c.to - c.from), 0);
  let done = 0;
  return changes.map(({ fill, from, to }) => {
    const start = done / total;
    done += Math.abs(to - from);
    const end = done / total;
    return fill.animate(
      [
        { offset: 0, transform: `scaleX(${from})` },
        { offset: start, transform: `scaleX(${from})` },
        { offset: end, transform: `scaleX(${to})` },
        { offset: 1, transform: `scaleX(${to})` },
      ],
      GLIDE,
    );
  });
}

/**
 * The spotlight pager's lines on a press: the lines between the old slide
 * and the pressed one fill (forward) or empty (back) as one sweep, starting
 * from what was drawn at the press (the old line's partial countdown, or a
 * sweep under way). The current line's countdown is never animated: it
 * owns its transform. Autoplay, a swipe, Back's restore and reduced motion
 * leave the lines as they are drawn. `press` goes before the press's
 * state change; `current` is the pager's current line.
 */
export default function usePagerSweep(
  group: RefObject<HTMLElement | null>,
  current: number,
) {
  /** Each line's drawn fill at the press, until the press's line is current */
  const pressed = useRef<ReadonlyArray<number> | null>(null);
  const running = useRef<ReadonlyArray<Animation>>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the current line changes, reading the lines it drew
  useLayoutEffect(() => {
    const before = pressed.current;
    pressed.current = null;
    const lines = group.current;
    if (!before || !lines || matchesNow(REDUCED_MOTION)) {
      return;
    }
    for (const animation of running.current) {
      animation.cancel();
    }
    const changes: Change[] = [];
    lines.querySelectorAll<HTMLElement>(FILL).forEach((fill) => {
      const index = Number(
        fill.closest<HTMLElement>('[data-index]')?.dataset.index,
      );
      const from = before[index] ?? 0;
      const to = index < current ? 1 : 0;
      const moves = from !== to && typeof fill.animate === 'function';
      if (index !== current && moves) {
        changes.push({ fill, from, to });
      }
    });
    // the front runs towards the pressed line
    const forward = changes.some((change) => change.to === 1);
    const order = forward ? changes : [...changes].reverse();
    running.current = sweep(order);
  }, [current]);

  return (index: number) => {
    const lines = group.current;
    pressed.current =
      lines && index !== current ? fillsOf(lines).map(drawnScale) : null;
  };
}
