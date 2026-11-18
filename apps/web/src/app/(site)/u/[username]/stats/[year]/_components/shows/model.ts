import type { StatsShowRow } from '@tvseri.es/schemas';
import { DAY_MS, firstMondayOf, formatDuration } from '@tvseri.es/utils';

import { SHORT_MONTHS } from '@/lib/format/months';
import { plural } from '@/lib/format/text';
import type { YearState } from '@/lib/stats/statsYear';
import {
  monthDay,
  monthName,
  monthStarts,
  WEEKS,
  weekIndexAt,
} from '@/lib/stats/weeks';
import { formatYearHours } from '../../_lib/format';

/** Rows listed before "All 71 shows" (the top 20 by hours) */
export const TOP_ROWS = 20;
/** The phone shows the first 16 of those */
export const PHONE_ROWS = 16;
/**
 * An unfinished show was "still watching" when its last episode fell in the
 * 14 days before the end of the year (or before the latest watch, in a year
 * in progress). Older than that it is "caught up": the tick.
 */
const STILL_WATCHING_DAYS = 14;

export type SortOrder = 'watched' | 'hours';

/** What the client timeline needs of one show: nothing else crosses to it */
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
  /** "Jan – Feb", "Apr": where the line is, for a phone window that misses it */
  months: string;
}>;

export type Timeline = Readonly<{
  /** Every show, in the order watched */
  rows: ReadonlyArray<TimelineRow>;
  total: number;
  /** What the list leaves out: shows past the top 20 and their episodes */
  moreShows: number;
  moreEpisodes: number;
}>;

/** A phone draws a week 24px wide and shows the year a quarter at a time */
export const PHONE_WEEK_PX = 24;
/** The phone's full-year track: 53 weeks of 24px */
export const PHONE_TRACK_PX = WEEKS * PHONE_WEEK_PX;
/** The weeks a 390px phone shows (318px of lane), until it measures its own */
export const NOMINAL_WEEKS = 318 / PHONE_WEEK_PX;

/** The quarter switch's labels, Jan–Mar first */
export const QUARTERS = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'] as const;

/**
 * The month (0 to 11) a visual week belongs to: the month of its Thursday,
 * as ISO weeks count. Week 52 can run into January: it stays December.
 */
export function monthOfWeek(week: number, year: number): number {
  const thursday = new Date(firstMondayOf(year) + (week * 7 + 3) * DAY_MS);
  return thursday.getUTCFullYear() > year ? 11 : thursday.getUTCMonth();
}

/** "Jan – Feb", or "Apr" when a line starts and ends in one month */
function monthSpan(start: number, end: number, year: number): string {
  const first = SHORT_MONTHS[monthOfWeek(start, year)] ?? '';
  const last = SHORT_MONTHS[monthOfWeek(end - 1, year)] ?? '';
  return first === last ? first : `${first} – ${last}`;
}

/** The quarter (0 to 3) a visual week belongs to */
export const quarterOfWeek = (week: number, year: number) =>
  Math.floor(monthOfWeek(week, year) / 3);

/**
 * Where each quarter starts along the 53 weeks, in weeks: the first day of
 * April, July and October; the first quarter at the start of the track (week
 * 0 can start in December).
 */
export function quarterStarts(year: number): ReadonlyArray<number> {
  const months = monthStarts(year);
  return [0, 3, 6, 9].map((month) =>
    month === 0 ? 0 : (months[month]?.at ?? 0) * WEEKS,
  );
}

/**
 * The quarter a phone opens on: the first of a finished year, the current
 * one of a year in progress.
 */
export function openingQuarter(
  year: number,
  state: YearState,
  currentWeek: number | undefined,
): number {
  return state === 'current' && currentWeek !== undefined && currentWeek >= 0
    ? quarterOfWeek(currentWeek, year)
    : 0;
}

/**
 * The quarter a phone's window shows: the one whose start is nearest the
 * scroll position (px), each start held at the furthest the window can
 * scroll (`max`), so the last quarter is reachable on a wide phone too.
 */
export function activeQuarter(
  scrollLeft: number,
  startsPx: ReadonlyArray<number>,
  max: number,
): number {
  let best = 0;
  startsPx.forEach((start, index) => {
    const distance = Math.abs(scrollLeft - Math.min(start, max));
    const bestDistance = Math.abs(
      scrollLeft - Math.min(startsPx[best] ?? 0, max),
    );
    if (distance <= bestDistance) {
      best = index;
    }
  });
  return best;
}

/** Weeks the overview's slider moves for PageUp and PageDown */
const PAGE_WEEKS = 13;

/**
 * Where a key moves the overview's slider, in weeks (`week` now, 0 to
 * `last`): the arrows a week, PageUp and PageDown about a quarter, Home and
 * End to the ends. Any other key: `null`.
 */
export function sliderWeek(
  key: string,
  week: number,
  last: number,
): number | null {
  const steps: Readonly<Record<string, number>> = {
    ArrowDown: week - 1,
    ArrowLeft: week - 1,
    ArrowRight: week + 1,
    ArrowUp: week + 1,
    End: last,
    Home: 0,
    PageDown: week - PAGE_WEEKS,
    PageUp: week + PAGE_WEEKS,
  };
  const next = steps[key];
  return next === undefined ? null : Math.min(Math.max(next, 0), last);
}

/**
 * The scroll (px, 0 to `max`) that puts the overview's window's left edge
 * at `left` px along an overview `track` px wide.
 */
export const scrollForWindow = (left: number, track: number, max: number) =>
  track > 0 ? Math.min(Math.max((left * PHONE_TRACK_PX) / track, 0), max) : 0;

/**
 * Where a press holds the overview's window, in px from its left edge: where
 * it landed on the window, or its middle when it landed beside it (the
 * window jumps there, centred on the pointer).
 */
export const grabOffset = (pointer: number, left: number, width: number) =>
  pointer >= left && pointer <= left + width ? pointer - left : width / 2;

/** "January to March": the months of the weeks in view, `from` to `to` */
export function monthsInView(from: number, to: number, year: number): string {
  const lastWeek = Math.min(Math.max(from, Math.ceil(to) - 1), WEEKS - 1);
  const first = monthName(monthOfWeek(Math.floor(from), year));
  const last = monthName(monthOfWeek(lastWeek, year));
  return first === last ? first : `${first} to ${last}`;
}

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
    const range = weekRange(row, year);
    return {
      ...range,
      hours: formatYearHours(row.runtimeMinutes),
      id: row.id,
      label: describeRow(row, year, status),
      live,
      months: monthSpan(range.start, range.end, year),
      rank: rankOf.get(index) ?? index,
      title: row.title,
    };
  });
  const left = shows.filter((_, index) => (rankOf.get(index) ?? 0) >= TOP_ROWS);
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
  const shown = expanded ? rows : rows.filter((row) => row.rank < TOP_ROWS);
  return order === 'hours'
    ? shown.slice().sort((a, b) => a.rank - b.rank)
    : shown;
}
