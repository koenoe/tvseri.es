import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

import { SHEET_EASE } from './ease';

/** The sheet's pace: a pressed control opening into what replaced it */
const GROW = {
  duration: 280,
  easing: `cubic-bezier(${SHEET_EASE.join(', ')})`,
} as const;

/**
 * What a press turned into opens out of the pressed control: `element` is
 * clipped to `from` (the control's box, read at the press) and opens to its
 * own box, as a pill. Clip only, so nothing around it moves. Not with
 * reduced motion, nor without Web Animations.
 *
 * @example
 * growFromBox(single, pressedButton.getBoundingClientRect());
 */
export function growFromBox(element: HTMLElement, from: DOMRect) {
  if (typeof element.animate !== 'function' || matchesNow(REDUCED_MOTION)) {
    return null;
  }
  const to = element.getBoundingClientRect();
  if (to.width === 0 || to.height === 0) {
    return null;
  }
  const round = `round ${Math.min(from.height, to.height) / 2}px`;
  const inset = [
    Math.max(0, from.top - to.top),
    Math.max(0, to.right - from.right),
    Math.max(0, to.bottom - from.bottom),
    Math.max(0, from.left - to.left),
  ]
    .map((px) => `${px}px`)
    .join(' ');
  return element.animate(
    [
      { clipPath: `inset(${inset} ${round})` },
      { clipPath: `inset(0px 0px 0px 0px ${round})` },
    ],
    GROW,
  );
}
