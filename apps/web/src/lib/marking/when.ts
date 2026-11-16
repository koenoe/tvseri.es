import type { MarkWhen } from '@tvseri.es/schemas';

import { formatWhen } from '@/lib/format/when';

// No date library here: this module is in every page's first load (via
// `useMarking`), and the arithmetic below is a few local-day steps.
/** Local midnight `days` after (or before) `date`'s day. */
const dayOffset = (date: Date | number, days: number) => {
  const day = new Date(date);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
};

/**
 * The date picker's answers (`.dp`): When (Just now, Yesterday, Last weekend,
 * On release day), Without a day (I don't remember, Skipped, Not watched) or a
 * picked day. `skip` and `unmark` aren't dates: `useMarking().setWhen` turns
 * them into a skip or an unmark.
 */
export type WhenChoice = Readonly<
  | { kind: 'now' }
  | { kind: 'yesterday' }
  | { kind: 'weekend' }
  | { kind: 'release' }
  | { kind: 'unknown' }
  | { kind: 'day'; day: Date }
>;

/** The same local clock time a calendar day earlier (DST-safe). */
const yesterdaySameTime = (now: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - 1);
  return date.getTime();
};

/** At 21:00 local on that day, never later than `now`. */
const evening = (day: Date, now: number) =>
  Math.min(
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), 21).getTime(),
    now,
  );

/**
 * Saturday of the last weekend that is over: the Saturday before the most
 * recent Sunday strictly before today (Thu 12 Nov → Sat 7 Nov).
 */
export function lastWeekend(now: number): Date {
  const today = dayOffset(now, 0);
  const daysSinceSunday = today.getDay() === 0 ? 7 : today.getDay();
  return dayOffset(today, -daysSinceSunday - 1);
}

/** The API's `MarkWhen` for a picker answer. */
export function toMarkWhen(choice: WhenChoice, now: number): MarkWhen {
  switch (choice.kind) {
    case 'now':
      return { kind: 'now' };
    case 'yesterday':
      return { kind: 'date', watchedAt: yesterdaySameTime(now) };
    case 'weekend':
      return { kind: 'date', watchedAt: evening(lastWeekend(now), now) };
    case 'release':
      return {
        kind: 'release',
        tzOffsetMinutes: new Date(now).getTimezoneOffset(),
      };
    case 'unknown':
      return { kind: 'unknown' };
    case 'day':
      return { kind: 'date', watchedAt: evening(choice.day, now) };
  }
}

/** The toast's "when": "Just now", "Yesterday", "On release day", "Nov 7"… */
export function whenLabel(choice: WhenChoice, now: number): string {
  switch (choice.kind) {
    case 'now':
      return 'Just now';
    case 'yesterday':
      return 'Yesterday';
    case 'weekend':
      return 'Last weekend';
    case 'release':
      return 'On release day';
    case 'unknown':
      return 'I don’t remember when';
    case 'day':
      return formatWhen(choice.day, now, { zone: 'local' });
  }
}
