import type { YearState } from '../../_lib/year';

/** "2026 so far" for the year in progress, else the year */
export const yearLabel = (year: number, state: YearState) =>
  state === 'current' ? `${year} so far` : String(year);

/**
 * The phone's pill row: the newest years that fit, then "More" (the full
 * list with counts and sparklines, as STMobile draws it beside three years)
 * whenever there is more than one year. The page's year always has its pill (it replaces the last
 * one), so the filled pill is never hidden in the sheet.
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
