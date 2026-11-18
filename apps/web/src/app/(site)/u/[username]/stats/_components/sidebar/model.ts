import { shouldFold } from '@/lib/fold';
import type { YearState } from '@/lib/stats/statsYear';

/** "2026 so far" for the year in progress, else the year */
export const yearLabel = (year: number, state: YearState) =>
  state === 'current' ? `${year} so far` : String(year);

/**
 * The phone's pill row: the newest years that fit, then "More" (the full
 * list with counts and sparklines) whenever there is more than one year. The
 * page's year always has its pill (it replaces the last one), so the filled
 * pill is never hidden in the sheet.
 */
export function visiblePills(
  years: ReadonlyArray<number>,
  selected: number,
  max: number,
): Readonly<{ years: ReadonlyArray<number>; more: boolean }> {
  if (years.length <= max) {
    return { more: years.length > 1, years };
  }
  const head = years.slice(0, max);
  if (head.includes(selected) || !years.includes(selected)) {
    return { more: true, years: head };
  }
  return { more: true, years: [...head.slice(0, max - 1), selected] };
}

/**
 * The sidebar's folded Years list: the newest `max` years, plus the page's
 * year where it falls when it is older, so the highlighted row never hides
 * behind "Show all". It folds only by the app's rule (`shouldFold`: more
 * than three left out on desktop), so a short tail shows whole, like every
 * other "Show all" list. `hidden` says whether the fold leaves any year out.
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
