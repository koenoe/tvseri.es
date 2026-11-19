import type { Premiere, PremiereKind } from '@tvseri.es/schemas';
import { countdownOf, plural } from '@tvseri.es/utils';
import { DAY_MONTH_PATTERN, WEEKDAY_PATTERN } from '@/lib/format/date';

import { formatDay } from '@/lib/format/datePattern';

/**
 * Labels for the Premieres tickets and the Countdown. Dates are `YYYY-MM-DD` calendar days (written the same in
 * every time zone), and
 * `daysAway` is the API's count from the day the list was built, so the
 * server and the browser always agree.
 */

export type TicketStub = Readonly<{
  /** null for Tonight, which shows the dot instead */
  count: number | null;
  unit: 'Day' | 'Days' | 'Months' | 'Tonight' | 'Weeks';
}>;

/**
 * The stub: Tonight, 1 day, 6 days, then whole weeks (21 days = 3 weeks),
 * then months (the shared `countdownOf` rule; the 60-day list stays in weeks)
 */
export function ticketStub(daysAway: number): TicketStub {
  const { count, unit } = countdownOf(daysAway);
  if (unit === 'today') {
    return { count: null, unit: 'Tonight' };
  }
  if (unit === 'day') {
    return { count, unit: count === 1 ? 'Day' : 'Days' };
  }
  return { count, unit: unit === 'week' ? 'Weeks' : 'Months' };
}

/** "Thu 12 Nov", or "Tonight" on the day */
export function ticketDate(date: string, daysAway: number): string {
  if (daysAway <= 0) {
    return 'Tonight';
  }
  return formatDay(date, WEEKDAY_PATTERN);
}

export function kindLabel(kind: PremiereKind, seasonNumber: number): string {
  switch (kind) {
    case 'new-series':
      return 'New series';
    case 'season-finale':
      return 'Season finale';
    case 'special':
      return 'Special';
    default:
      return `Season ${seasonNumber} premiere`;
  }
}

/** Pink for a premiere, cyan for a season finale */
export const kindTone = (kind: PremiereKind) =>
  kind === 'season-finale' ? 'cyan' : 'pink';

export function releaseLabel(release: Premiere['release']): string | null {
  if (release === 'weekly') {
    return 'Weekly';
  }
  return release === 'full-season' ? 'Full season' : null;
}

/** The ticket link's name: "Dept. Q, Season 2 premiere, Thu 12 Nov, full season, on Netflix" */
export function ticketLabel(premiere: Premiere): string {
  const release = releaseLabel(premiere.release);
  const network = premiere.series.network?.name;
  return [
    premiere.series.title,
    kindLabel(premiere.kind, premiere.seasonNumber),
    ticketDate(premiere.date, premiere.daysAway),
    release?.toLowerCase(),
    network ? `on ${network}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
}

/** The Countdown's season: "Season 4" for a new season, else the kind ("Special") */
export const countdownSeason = (kind: PremiereKind, seasonNumber: number) =>
  kind === 'season-premiere'
    ? `Season ${seasonNumber}`
    : kindLabel(kind, seasonNumber);

/** The Countdown's date: "Nov 17" */
export function countdownDate(date: string): string {
  return formatDay(date, DAY_MONTH_PATTERN);
}

export const countdownUnit = (daysAway: number) =>
  daysAway === 1 ? 'day to go' : 'days to go';

/** A chip's line: "In 3 days" */
export function countdownChip(daysAway: number): string {
  if (daysAway <= 0) {
    return 'Tonight';
  }
  return `In ${plural(daysAway, 'day')}`;
}

/** The progress line over the last 30 days, never under 4% */
export const countdownFill = (daysAway: number) =>
  Math.max(4, Math.min(100, Math.round(100 - (daysAway / 30) * 100)));
