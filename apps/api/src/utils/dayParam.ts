import { isoWeekOf } from '@tvseri.es/utils';
import * as v from 'valibot';

import { addDaysUtc, todayUtc } from './time';

/**
 * `?date=YYYY-MM-DD` for the date-pure home routes: exactly yesterday, today
 * or tomorrow (UTC), compared as date strings. A wider window would let the
 * date make the API build (and cache) an unbounded number of days.
 */
export const DayQuerySchema = v.object({
  date: v.pipe(
    v.string(),
    v.isoDate(),
    v.check((date) => {
      const today = todayUtc();
      return (
        date === addDaysUtc(today, -1) ||
        date === today ||
        date === addDaysUtc(today, 1)
      );
    }, 'Date out of range'),
  ),
});

/**
 * `?week=YYYY-Www` for the week-pure home routes: only the ISO week (UTC) of
 * yesterday, today or tomorrow, the days a web render can ask for. A wider
 * window would let the week make the API build (and cache) any number of
 * weeks.
 */
export const WeekQuerySchema = v.object({
  week: v.pipe(
    v.string(),
    v.regex(/^\d{4}-W\d{2}$/, 'Expected YYYY-Www'),
    v.check((week) => {
      const today = todayUtc();
      return [-1, 0, 1].some(
        (days) => isoWeekOf(addDaysUtc(today, days)) === week,
      );
    }, 'Week out of range'),
  ),
});
