import type {
  Calendar,
  CalendarShow,
  CalendarTicket,
} from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

import { monthName, monthOf, spokenDay } from './calendarDates';

/** What the page hands the grid: everything but No date yet */
export type CalendarData = Omit<Calendar, 'noDateYet'>;

export type DayTicket = Readonly<{
  show: CalendarShow;
  ticket: CalendarTicket;
}>;

/** One day with episodes, as its cell and its popover draw it */
export type CalendarDayModel = Readonly<{
  date: string;
  daysToGo: number;
  /** In the API's order: premieres, then finales, then the rest */
  tickets: ReadonlyArray<DayTicket>;
  /** The poster on top of the cell's stack */
  lead: CalendarShow;
  /**
   * Up to two cards behind it, only for other shows: their posters (null: a
   * show without one). One show's several episodes are ×N alone.
   */
  behind: ReadonlyArray<string | null>;
  /** Every episode that day, across its shows: the cell's ×N */
  episodes: number;
  /** The lead's premiere dot or finale ring */
  mark: DayMark;
  /** One per show, in the API's order: the phone's dots */
  marks: ReadonlyArray<DayMark>;
}>;

/** A premiere's dot, a finale's ring, or null: a plain episode */
export type DayMark = 'premiere' | 'finale' | null;

export type CalendarModel = Readonly<{
  today: string;
  /** `YYYY-MM`: the months the calendar covers */
  firstMonth: string;
  lastMonth: string;
  days: ReadonlyMap<string, CalendarDayModel>;
  /** Every day with episodes, in order */
  dated: ReadonlyArray<string>;
}>;

const MARK: Readonly<Record<CalendarTicket['kind'], DayMark>> = {
  episode: null,
  'season-finale': 'finale',
  'season-premiere': 'premiere',
};

export function buildCalendar(data: CalendarData): CalendarModel {
  const shows = new Map(data.shows.map((show) => [show.seriesId, show]));
  const days = new Map<string, CalendarDayModel>();
  for (const day of data.days) {
    const tickets = day.tickets.flatMap((ticket) => {
      const show = shows.get(ticket.seriesId);
      return show ? [{ show, ticket }] : [];
    });
    const [first] = tickets;
    if (!first) {
      continue;
    }
    const episodes = tickets.reduce(
      (sum, { ticket }) => sum + ticket.episodes.length,
      0,
    );
    // each show once, as its first ticket (premieres and finales lead)
    const perShow = new Map<number, DayTicket>();
    for (const entry of tickets) {
      if (!perShow.has(entry.show.seriesId)) {
        perShow.set(entry.show.seriesId, entry);
      }
    }
    const shown = [...perShow.values()];
    const behind = shown
      .slice(1, 3)
      .map(({ show }) => show.posterImage || null);
    days.set(day.date, {
      behind,
      date: day.date,
      daysToGo: day.daysToGo,
      episodes,
      lead: first.show,
      mark: MARK[first.ticket.kind],
      marks: shown.map(({ ticket }) => MARK[ticket.kind]),
      tickets,
    });
  }
  return {
    dated: [...days.keys()].sort(),
    days,
    firstMonth: monthOf(data.from),
    lastMonth: monthOf(data.to),
    today: data.today,
  };
}

export const coversMonth = (calendar: CalendarModel, month: string) =>
  month >= calendar.firstMonth && month <= calendar.lastMonth;

/**
 * A press on a day: it opens when something airs, in its own month, so a
 * day in the grid's outside rows first slides the grid there
 */
export function pickDay(
  calendar: CalendarModel,
  viewMonth: string,
  iso: string,
): Readonly<{ day: string; month: string; slide: boolean }> | null {
  if (!calendar.days.has(iso)) {
    return null;
  }
  const month = monthOf(iso);
  return { day: iso, month, slide: month !== viewMonth };
}

/** The dated day before or after `iso`, across months: the popover's ‹ › */
export function nearDated(
  calendar: CalendarModel,
  iso: string,
  step: -1 | 1,
): string | null {
  const { dated } = calendar;
  if (step > 0) {
    return dated.find((day) => day > iso) ?? null;
  }
  for (let index = dated.length - 1; index >= 0; index -= 1) {
    const day = dated[index] as string;
    if (day < iso) {
      return day;
    }
  }
  return null;
}

type Counts = Readonly<{
  episodes: number;
  finales: number;
  premieres: number;
  shows: number;
}>;

function countTickets(tickets: ReadonlyArray<DayTicket>): Counts {
  const shows = new Set<number>();
  let episodes = 0;
  let premieres = 0;
  let finales = 0;
  for (const { ticket } of tickets) {
    shows.add(ticket.seriesId);
    episodes += ticket.episodes.length;
    premieres += ticket.kind === 'season-premiere' ? 1 : 0;
    finales += ticket.kind === 'season-finale' ? 1 : 0;
  }
  return { episodes, finales, premieres, shows: shows.size };
}

/** "4 shows · 3 premieres", "1 show · 6 episodes · 1 premiere" */
export function daySummary(day: CalendarDayModel): string {
  const counts = countTickets(day.tickets);
  return [
    plural(counts.shows, 'show'),
    counts.episodes > counts.shows ? plural(counts.episodes, 'episode') : '',
    counts.premieres ? plural(counts.premieres, 'premiere') : '',
    counts.finales ? plural(counts.finales, 'finale') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A month's tickets; this month's only from today on (what is still to come) */
function monthTickets(calendar: CalendarModel, month: string) {
  const from = month === monthOf(calendar.today) ? calendar.today : '';
  return calendar.dated
    .filter((iso) => monthOf(iso) === month && iso >= from)
    .flatMap((iso) => calendar.days.get(iso)?.tickets ?? []);
}

/** How many shows air in a month (this month: from today on) */
export const showsIn = (calendar: CalendarModel, month: string) =>
  countTickets(monthTickets(calendar, month)).shows;

/**
 * Under the month's name: "33 episodes this month · 8 shows · 5 premieres";
 * this month counts what is still to come
 */
export function monthSummary(calendar: CalendarModel, month: string): string {
  const counts = countTickets(monthTickets(calendar, month));
  if (counts.episodes === 0) {
    return 'Nothing dated this month';
  }
  const current = month === monthOf(calendar.today);
  return [
    `${plural(counts.episodes, 'episode')} ${current ? 'still to come ' : ''}this month`,
    plural(counts.shows, 'show'),
    counts.premieres ? plural(counts.premieres, 'premiere') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The sidebar's months: only those with something still to come, and their shows */
export function datedMonths(
  calendar: CalendarModel,
): ReadonlyArray<Readonly<{ month: string; shows: number }>> {
  const months = [...new Set(calendar.dated.map(monthOf))];
  return months
    .map((month) => ({ month, shows: showsIn(calendar, month) }))
    .filter(({ shows }) => shows > 0);
}

/** Whether anything is dated in this month or after it */
export const datedFrom = (calendar: CalendarModel, month: string) =>
  calendar.dated.some((iso) => monthOf(iso) >= month);

/** Today's button: "Today, Thursday 19 November" */
export const todayName = (calendar: CalendarModel) =>
  `Today, ${spokenDay(calendar.today)}`;

/**
 * A day's name for its button: "Friday 4 December, 4 shows · 3 premieres:
 * Silo, Slow Horses, The Studio, The Gilded Age"; ", nothing airs" for an
 * empty day still to come; a day of another month says it opens there
 */
export function dayLabel(
  calendar: CalendarModel,
  iso: string,
  opensMonth: string | null,
): string {
  const day = calendar.days.get(iso);
  const names = day?.tickets.map(({ show }) => show.title).join(', ');
  const what = day
    ? `, ${daySummary(day)}: ${names}`
    : iso < calendar.today
      ? ''
      : ', nothing airs';
  const opens = opensMonth ? ` (opens ${monthName(opensMonth)})` : '';
  return `${spokenDay(iso)}${what}${opens}`;
}
