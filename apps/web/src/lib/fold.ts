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

/**
 * A folded list of years (the Stats and History sidebars): the newest `max`
 * years, plus the `selected` year where it falls when it is older, so the
 * highlighted row never hides behind "Show all". It folds only by the app's
 * rule (`shouldFold`), so a short tail shows whole, like every other "Show
 * all" list. `hidden` says whether the fold leaves any year out.
 */
export function visibleYears(
  years: ReadonlyArray<number>,
  selected: number | null,
  max: number,
): Readonly<{ years: ReadonlyArray<number>; hidden: boolean }> {
  const shown = years.filter((year, index) => index < max || year === selected);
  if (!shouldFold(years.length - shown.length, 'desktop')) {
    return { hidden: false, years };
  }
  return { hidden: true, years: shown };
}
