import { SHEET_EASE } from './ease';

/**
 * One fold for every part that opens to its own height (the calendar's No
 * date yet, a Connected apps card): it opens in 320ms with a 200ms fade and
 * shuts in 240ms. With reduced motion it snaps.
 */
export const FOLD_OPEN = { height: 'auto', opacity: 1 } as const;
export const FOLD_SHUT = { height: 0, opacity: 0 } as const;

export const FOLD_OPEN_TIMING = {
  height: { duration: 0.32, ease: SHEET_EASE },
  opacity: { duration: 0.2, ease: 'easeOut' },
} as const;

export const FOLD_SHUT_TIMING = {
  height: { duration: 0.24, ease: SHEET_EASE },
  opacity: { duration: 0.12 },
} as const;

export const FOLD_SNAP = { duration: 0 } as const;

/**
 * An item that leaves a list (a review entry fixed or skipped): it fades
 * and lifts 4px in 120ms, then the gap it leaves shuts in 240ms. `delay`
 * holds it back (a Skip all's items leave 30ms apart); with reduced motion
 * the lift and the gap snap and the fade stays.
 */
export const leaveFold = (delay: number, reduced: boolean) =>
  ({
    height: 0,
    opacity: 0,
    transition: {
      height: {
        delay: delay + 0.12,
        duration: reduced ? 0 : 0.24,
        ease: SHEET_EASE,
      },
      opacity: { delay, duration: 0.12, ease: 'easeOut' },
      y: { delay, duration: reduced ? 0 : 0.12, ease: 'easeOut' },
    },
    y: -4,
  }) as const;
