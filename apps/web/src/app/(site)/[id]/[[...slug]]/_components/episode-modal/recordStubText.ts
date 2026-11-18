import { formatAirWeekdayDate } from '@/lib/format/airDate';
import type { EpisodeState, WatchRecord } from '@/lib/marking/types';

import {
  airDayStart,
  formatWatchedAt,
  formatWatchedDay,
} from '../episodes/format';

/**
 * The record stub: desktop reads
 * "Jul 5, 2025, 22:02" / "Change date · See full history" (where it was
 * watched is not named here: it arrives after the mark and would push the
 * links; the history sheet names it); the phone
 * reads "Watched Jul 20, 2023" / "Change date ·
 * See full history".
 */
export type RecordStub = Readonly<{
  /** The eye is on (watched, or watched without a date). */
  pressed: boolean;
  /** "Change date" once there is a record (or a skip), else "Add a date". */
  dateAction: 'Add a date' | 'Change date';
  /** Bold line and the part before the links ("Next up", "Aired …"). */
  desktop: Readonly<{ line: string; sub: string | null }>;
  /** Bold line only; the links follow on the second line. */
  phone: Readonly<{ line: string }>;
}>;

type Input = Readonly<{
  /** `undefined` until the show is seeded: drawn as not watched. */
  state: EpisodeState | undefined;
  record: WatchRecord | undefined;
  isNextUp: boolean;
  /** `YYYY-MM-DD` or ''. */
  airDate: string;
  now: number;
}>;

/** "today", "yesterday", "Wed", "Jan 8" or "Jul 20, 2023" (UTC days) */
const watchedDay = (watchedAt: number, now: number): string =>
  formatWatchedDay(watchedAt, { now }, false);

/** "Airs Fri Jun 26" until the air day starts (local), then "Aired …" */
function airLine(airDate: string, now: number): string | null {
  const start = airDayStart(airDate);
  if (start === null) {
    return null;
  }
  const label = formatAirWeekdayDate(airDate, now);
  return start > now ? `Airs ${label}` : `Aired ${label}`;
}

/**
 * The modal's record stub:
 * what the viewer did with this one episode, and the date action.
 */
export function toRecordStub({
  airDate,
  isNextUp,
  now,
  record,
  state,
}: Input): RecordStub {
  if (state === 'watched' && record) {
    return {
      dateAction: 'Change date',
      desktop: { line: formatWatchedAt(record.watchedAt, now), sub: null },
      phone: { line: `Watched ${watchedDay(record.watchedAt, now)}` },
      pressed: true,
    };
  }
  if (state === 'unknown' || state === 'watched') {
    return {
      dateAction: 'Change date',
      desktop: { line: 'Don’t remember when', sub: null },
      phone: { line: 'Watched · don’t remember when' },
      pressed: true,
    };
  }
  if (state === 'skipped') {
    return {
      dateAction: 'Change date',
      desktop: { line: 'Skipped', sub: airLine(airDate, now) },
      phone: { line: 'Skipped' },
      pressed: false,
    };
  }
  return {
    dateAction: 'Add a date',
    desktop: {
      line: 'Not watched yet',
      sub: isNextUp ? 'Next up' : airLine(airDate, now),
    },
    phone: { line: 'Not watched yet' },
    pressed: false,
  };
}
