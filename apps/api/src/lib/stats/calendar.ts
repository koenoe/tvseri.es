import type { AllTimeItem, AllTimeStats } from './segments';
import { localParts } from './timeZone';

/**
 * A series' watch calendar: what the all-time segment (the years list, the
 * undated count, the first watch per series) is folded from. Built at read
 * time from each show's per-show summary (lib/rollups), in the owner's zone
 * (the zone the stats count in, from their country, as the heatmap does);
 * nothing of it is stored, so a country change needs no rebuild.
 */
type SeriesCalendar = Readonly<{
  /** Dated regular episodes and their minutes per local month (`YYYY-MM`) */
  m: Readonly<Record<string, readonly [episodes: number, minutes: number]>>;
  /** Undated regular episodes ("I don't remember") */
  u: number;
  /** The first dated regular watch, null without one */
  f: number | null;
}>;

type CalendarItem = SeriesCalendar & Readonly<{ seriesId: number }>;

/** One series' calendar from all its watched items (specials never count) */
export const seriesCalendar = (
  items: ReadonlyArray<
    Pick<AllTimeItem, 'watchedAt' | 'runtime' | 'seasonNumber'> &
      Readonly<{ dateUnknown?: boolean }>
  >,
  timeZone: string,
): SeriesCalendar => {
  const months: Record<string, [number, number]> = {};
  let undated = 0;
  let first: number | null = null;
  for (const item of items) {
    if ((item.seasonNumber ?? 1) === 0) {
      continue;
    }
    if (item.dateUnknown) {
      undated += 1;
      continue;
    }
    const month = localParts(item.watchedAt, timeZone).date.slice(0, 7);
    const row = months[month] ?? [0, 0];
    months[month] = row;
    row[0] += 1;
    row[1] += item.runtime ?? 0;
    first = first === null ? item.watchedAt : Math.min(first, item.watchedAt);
  }
  return { f: first, m: months, u: undated };
};

/** The all-time segment folded from every series' calendar */
export const foldCalendar = (
  shows: ReadonlyArray<CalendarItem>,
  timeZone: string,
): AllTimeStats => {
  const perYear = new Map<
    number,
    { episodes: number; months: Array<{ episodes: number; minutes: number }> }
  >();
  const first: Array<readonly [number, number]> = [];
  let undated = 0;
  for (const show of shows) {
    undated += show.u;
    if (show.f !== null) {
      first.push([show.seriesId, show.f]);
    }
    for (const [month, [episodes, minutes]] of Object.entries(show.m)) {
      const year = Number(month.slice(0, 4));
      const row = perYear.get(year) ?? {
        episodes: 0,
        months: Array.from({ length: 12 }, () => ({ episodes: 0, minutes: 0 })),
      };
      row.episodes += episodes;
      const cell = row.months[Number(month.slice(5, 7)) - 1]!;
      cell.episodes += episodes;
      cell.minutes += minutes;
      perYear.set(year, row);
    }
  }
  return {
    firstWatch: first.sort(([a], [b]) => a - b),
    timeZone,
    undated,
    years: [...perYear]
      .map(([year, { episodes, months }]) => ({ episodes, months, year }))
      .sort((a, b) => b.year - a.year),
  };
};
