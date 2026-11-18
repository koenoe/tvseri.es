/** A horizontal move this long (px) is a swipe */
const SWIPE_DISTANCE = 40;

/** Any index onto the loop of `count` slides (the last wraps to the first) */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return ((index % count) + count) % count;
}

/**
 * A finished touch as a step: 1 (swiped left, the next slide), -1 (swiped
 * right, the previous one) or 0 (a tap, or mostly vertical: a scroll).
 */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) <= Math.abs(dy)) {
    return 0;
  }
  return dx < 0 ? 1 : -1;
}
