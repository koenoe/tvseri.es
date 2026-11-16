/**
 * The app's one rule for "Show all / Show fewer" lists: a
 * list folds only when it would hide more than a desktop row of three, or
 * more than two on a phone. Fewer show whole, with no button.
 */
const FOLD_OVER = { desktop: 3, phone: 2 } as const;

export type FoldViewport = keyof typeof FOLD_OVER;

/** Whether a list that would hide `hidden` items folds on `viewport`. */
export const shouldFold = (hidden: number, viewport: FoldViewport): boolean =>
  hidden > FOLD_OVER[viewport];

/**
 * Where a list with the same preview on both viewports folds: everywhere,
 * on phones only (their threshold is lower), or nowhere. Rendered as CSS
 * (the markup stays viewport-free).
 */
export type Fold = 'all' | 'phone' | 'none';

export const foldOf = (hidden: number): Fold =>
  shouldFold(hidden, 'desktop')
    ? 'all'
    : shouldFold(hidden, 'phone')
      ? 'phone'
      : 'none';
