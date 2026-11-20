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
