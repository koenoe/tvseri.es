import type { StatsShowRow } from '@tvseri.es/schemas';
import { formatDuration } from '@/lib/format/duration';
import { plural } from '@/lib/format/text';
import { formatYearHours } from '../../_lib/format';
import { monthDay, WEEKS, weekIndexAt } from '../../_lib/weeks';
import type { YearState } from '../../_lib/year';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rows the board draws before "All 71 shows" (the top 20 by hours) */
export const BOARD_ROWS = 20;
/** The phone board draws the first 16 of those */
export const PHONE_ROWS = 16;
/**
 * An unfinished show was "still watching" when its last episode fell in the
 * 14 days before the end of the year (or before the latest watch, in a year
 * in progress). Older than that it is "caught up": the tick.
 */
const STILL_WATCHING_DAYS = 14;

export type SortOrder = 'watched' | 'hours';

/** What the client board needs of one show: nothing else crosses to it */
export type TimelineRow = Readonly<{
  id: number;
  title: string;
  /** "36h" */
  hours: string;
  /** The row's text for assistive tech */
  label: string;
  /** First week watched; the span starts here */
  start: number;
  /** One past the last week watched; the span ends here, with the tick or dot */
  end: number;
  /** Weeks with episodes */
  weeks: ReadonlyArray<number>;
  /** Still watching: the cyan dot instead of the tick */
  live: boolean;
  /** 0 = most hours */
  rank: number;
}>;

export type Timeline = Readonly<{
  /** Every show, in the order watched */
  rows: ReadonlyArray<TimelineRow>;
  total: number;
  /** What the board leaves out: shows past the top 20 and their episodes */
  moreShows: number;
  moreEpisodes: number;
}>;

/** Position along the 53 weeks, in percent */
export const weekPercent = (week: number) => (week / WEEKS) * 100;

/**
 * The moment "still watching" is measured against: the end of a finished
 * year; in a year in progress, the latest watch of the year.
 */
export function endReference(
  shows: ReadonlyArray<StatsShowRow>,
  year: number,
  state: YearState,
): number {
  if (state === 'finished') {
    return Date.UTC(year + 1, 0, 1) - 1;
  }
  return shows.reduce((latest, row) => Math.max(latest, row.lastWatchedAt), 0);
}

function weekRange(
  row: StatsShowRow,
  year: number,
): Readonly<{ start: number; end: number; weeks: ReadonlyArray<number> }> {
  const weeks = row.weeks.flatMap((count, week) => (count > 0 ? [week] : []));
  if (weeks.length > 0) {
    return { end: weeks[weeks.length - 1]! + 1, start: weeks[0]!, weeks };
  }
  // No weekly counts: fall back to the first and last watch
  const start = Math.max(0, weekIndexAt(row.firstWatchedAt, year));
  const last = Math.max(start, weekIndexAt(row.lastWatchedAt, year));
  return { end: last + 1, start, weeks: [start, last] };
}

function describeRow(
  row: StatsShowRow,
  year: number,
  status: 'finished' | 'still watching' | 'caught up',
): string {
  const dates = `${monthDay(row.firstWatchedAt, year)} to ${monthDay(row.lastWatchedAt, year)}`;
  return `${row.title}: ${plural(row.episodes, 'episode')}, ${dates}, ${formatDuration(row.runtimeMinutes)}, ${status}`;
}

/**
 * "The year in shows": one row per show, in the order the API gives them
 * (the order watched). `finishedIds` are the shows that reached Finished in
 * the year (`getFinished`): a tick. Unfinished shows watched in the last
 * `STILL_WATCHING_DAYS` before `reference` are live (the cyan dot); the rest
 * are caught up (a tick too).
 */
export function buildTimeline(
  shows: ReadonlyArray<StatsShowRow>,
  finishedIds: ReadonlySet<number>,
  year: number,
  reference: number,
): Timeline {
  const byHours = shows
    .map((row, index) => ({ index, minutes: row.runtimeMinutes }))
    .sort((a, b) => b.minutes - a.minutes || a.index - b.index);
  const rankOf = new Map(byHours.map((item, rank) => [item.index, rank]));
  const rows = shows.map((row, index): TimelineRow => {
    const finished = finishedIds.has(row.id);
    const live =
      !finished &&
      row.lastWatchedAt >= reference - STILL_WATCHING_DAYS * DAY_MS;
    const status = finished
      ? 'finished'
      : live
        ? 'still watching'
        : 'caught up';
    return {
      ...weekRange(row, year),
      hours: formatYearHours(row.runtimeMinutes),
      id: row.id,
      label: describeRow(row, year, status),
      live,
      rank: rankOf.get(index) ?? index,
      title: row.title,
    };
  });
  const left = shows.filter(
    (_, index) => (rankOf.get(index) ?? 0) >= BOARD_ROWS,
  );
  return {
    moreEpisodes: left.reduce((sum, row) => sum + row.episodes, 0),
    moreShows: left.length,
    rows,
    total: shows.length,
  };
}

/**
 * The rows on screen: the top 20 by hours (all of them once expanded), in
 * the order watched or by hours.
 */
export function rowsToShow(
  rows: ReadonlyArray<TimelineRow>,
  order: SortOrder,
  expanded: boolean,
): ReadonlyArray<TimelineRow> {
  const shown = expanded ? rows : rows.filter((row) => row.rank < BOARD_ROWS);
  return order === 'hours'
    ? shown.slice().sort((a, b) => a.rank - b.rank)
    : shown;
}
