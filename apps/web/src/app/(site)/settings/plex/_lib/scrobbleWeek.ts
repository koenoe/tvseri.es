import { DAY_MS, plural } from '@tvseri.es/utils';
import { utcParts, weekdayDayMonth } from '@/lib/format/date';
import { WEEKDAY_NAMES } from '@/lib/format/months';
import { scaledHeight } from '@/lib/scaledHeight';
import { localDay } from '@/lib/viewer/dayClock';

/**
 * The Last scrobble card's week: the last seven calendar days ending today,
 * in the viewer's own time zone, each with how many episodes Plex marked.
 * Pure (today is an argument), so it is tested without a browser; the card
 * calls it after hydration, when the zone is known.
 */

/** The bars' stub for a day without marks, and the least a day with one gets */
const EMPTY_BAR = 3;
const MIN_BAR = 8;

export type WeekDay = Readonly<{
  /** The local calendar date, `YYYY-MM-DD` */
  key: string;
  /** "Fri Nov 13" */
  label: string;
  /** "F" */
  letter: string;
  count: number;
  isToday: boolean;
}>;

/**
 * The seven days ending on `today` (`YYYY-MM-DD`, the viewer's local day),
 * oldest first, with each day's count of `marks`. Days step by calendar
 * date, not by 24 hours, so a week with a clock change still has seven
 * distinct days.
 */
export function weekOf(
  marks: ReadonlyArray<Readonly<{ watchedAt: number }>>,
  today: string,
): ReadonlyArray<WeekDay> {
  const counts = new Map<string, number>();
  for (const { watchedAt } of marks) {
    const key = localDay(watchedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [year, month, day] = today.split('-').map(Number);
  const last = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(last - (6 - index) * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    const weekday = WEEKDAY_NAMES[date.getUTCDay()] ?? '';
    return {
      count: counts.get(key) ?? 0,
      isToday: index === 6,
      key,
      label: weekdayDayMonth(utcParts(date), date.getUTCDay()),
      letter: weekday.charAt(0),
    };
  });
}

/**
 * A bar's height in px: scaled to the busiest day (`tallest` px), a 3px
 * stub for a day without marks, and never under 8px for a day with one, so
 * a binge doesn't flatten the rest of the week.
 */
export function barHeight(
  count: number,
  busiest: number,
  tallest: number,
): number {
  if (count <= 0 || busiest <= 0) {
    return EMPTY_BAR;
  }
  return scaledHeight(count, busiest, tallest, MIN_BAR);
}

/** "Fri Nov 13: 3 episodes" (a bar's accessible name) */
export const dayName = (day: WeekDay): string =>
  `${day.label}: ${day.count === 0 ? 'no episodes' : plural(day.count, 'episode')}`;
