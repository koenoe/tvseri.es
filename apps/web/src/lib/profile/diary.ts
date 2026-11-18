import {
  compareEpisodes,
  episodeCode,
  type StatsDaily,
  type StatsYears,
} from '@tvseri.es/schemas';
import {
  DAY_MS,
  dayKeyIn,
  formatRuntime,
  plural,
  startOfDayIn,
} from '@tvseri.es/utils';

import { MONTH_NAMES, SHORT_WEEKDAYS } from '@/lib/format/months';
import { pad2 } from '@/lib/format/pad2';
import { episodeRun } from '@/lib/marking/copy';
import type { DiaryItem } from '@/lib/profile/views';

/**
 * The History diary, pure: watched episodes become
 * months, days and rows (one show on one day). Days, months, their ranges
 * and This week are the owner's local ones, in the zone `/stats/years` and
 * `/stats/:year/daily` name (`timeZone`, the owner's country's: in UTC
 * an import at local midnight sat a day early, unlike the episode modal).
 * Every function takes that zone last (UTC when absent, as older answers).
 * The month index for Jump to and the month header lines come from the
 * cached `/stats/years`; the ranges a jump reads from `GET /user/:id/watched`
 * are built here too, so the page and the route handler agree.
 */

/** `YYYY-MM` */
export type MonthKey = string;

export type DiaryEpisode = Readonly<{
  /** Unique in its row */
  key: string;
  /** `S03E05` */
  code: string;
  season: number;
  episode: number;
  title: string | null;
  /** Minutes, 0 when unknown */
  runtime: number;
}>;

/** One show on one day */
export type DiaryRow = Readonly<{
  /** Unique in the diary: `YYYY-MM-DD:seriesId` */
  key: string;
  seriesId: number;
  show: string;
  slug: string;
  poster: string | null;
  /** The season of the row's last episode (E opens its history there) */
  season: number;
  /** In code order */
  episodes: ReadonlyArray<DiaryEpisode>;
  /** `S02E03–E05`, `S01E08–S02E01` or the one code */
  range: string;
  /** The episode's title on a one-episode row, else null */
  title: string | null;
  /** Minutes, summed */
  runtime: number;
  /** Two or more episodes sharing one `watchedAt`: "Marked in one go" */
  bulk: boolean;
}>;

export type DiaryDay = Readonly<{
  /** `YYYY-MM-DD` */
  key: string;
  /** `Sat` (the overline uppercases it) */
  weekday: string;
  day: number;
  rows: ReadonlyArray<DiaryRow>;
}>;

export type DiaryMonth = Readonly<{
  key: MonthKey;
  /** `March 2024` */
  title: string;
  /** `96 episodes · 76h 54m` */
  line: string;
  days: ReadonlyArray<DiaryDay>;
}>;

export type JumpMonth = Readonly<{
  key: MonthKey;
  /** `Mar` */
  label: string;
  /** `March 2026` */
  title: string;
  episodes: number;
}>;

export type JumpYear = Readonly<{
  year: number;
  episodes: number;
  /** Newest first, months with episodes only */
  months: ReadonlyArray<JumpMonth>;
}>;

type Years = StatsYears['years'];

/** The API's lowest `watchedAt`: where a jump starts reading */
const HISTORY_START = '2000-01-01T00:00:00.000Z';
const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

const monthKeyOf = (year: number, month: number): MonthKey =>
  `${year}-${pad2(month + 1)}`;

/** Year and zero-based month of a key */
const splitKey = (key: MonthKey) => {
  const [year = 0, month = 1] = key.split('-').map(Number);
  return { month: month - 1, year };
};

const monthTitle = (key: MonthKey) => {
  const { month, year } = splitKey(key);
  return `${MONTH_NAMES[month] ?? ''} ${year}`;
};

/** `2024-03` for a valid month from 2000 on, else null (the page falls back to the newest) */
export function parseMonthKey(
  value: string | null | undefined,
): MonthKey | null {
  const match = value ? MONTH_KEY.exec(value) : null;
  return match && Number(match[1]) >= 2000 ? match[0] : null;
}

/** The month's first and last millisecond in the zone, as `start_date`/`end_date` */
export function monthRange(
  key: MonthKey,
  timeZone = 'UTC',
): Readonly<{ startDate: string; endDate: string }> {
  const { month, year } = splitKey(key);
  const next =
    month === 11 ? monthKeyOf(year + 1, 0) : monthKeyOf(year, month + 1);
  return {
    endDate: new Date(startOfDayIn(`${next}-01`, timeZone) - 1).toISOString(),
    startDate: new Date(startOfDayIn(`${key}-01`, timeZone)).toISOString(),
  };
}

/** A jump: everything up to the end of the month, newest first */
export function jumpRange(
  key: MonthKey,
  timeZone = 'UTC',
): Readonly<{ startDate: string; endDate: string }> {
  return {
    endDate: monthRange(key, timeZone).endDate,
    startDate: HISTORY_START,
  };
}

type Draft = { latest: number; items: DiaryItem[] };

function toRow(dayKey: string, draft: Draft): DiaryRow {
  const items = [...draft.items].sort(compareEpisodes);
  // the grouping guarantees one item at least
  const first = items[0] as DiaryItem;
  const last = items.at(-1) as DiaryItem;
  const single = items.length === 1;
  return {
    bulk: !single && items.every((item) => item.watchedAt === first.watchedAt),
    episodes: items.map((item) => ({
      code: episodeCode(item),
      episode: item.episodeNumber,
      key: `${item.seasonNumber}:${item.episodeNumber}:${item.watchedAt}`,
      runtime: item.runtime,
      season: item.seasonNumber,
      title: item.episodeTitle || null,
    })),
    key: `${dayKey}:${first.seriesId}`,
    poster: first.posterImage ?? null,
    range: episodeRun(items),
    runtime: items.reduce((sum, item) => sum + item.runtime, 0),
    season: last.seasonNumber,
    seriesId: first.seriesId,
    show: first.title,
    slug: first.slug,
    title: single ? first.episodeTitle || null : null,
  };
}

function monthLine(
  key: MonthKey,
  years: Years | undefined,
  loaded: number,
): string {
  const { month, year } = splitKey(key);
  const stats = years?.find((row) => row.year === year)?.months?.[month];
  if (!stats || stats.episodes === 0) {
    return plural(loaded, 'episode');
  }
  const runtime = formatRuntime(stats.minutes);
  const episodes = plural(stats.episodes, 'episode');
  return runtime ? `${episodes} · ${runtime}` : episodes;
}

const sameItems = (
  a: ReadonlyArray<DiaryItem>,
  b: ReadonlyArray<DiaryItem>,
): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

function toDay(dayKey: string, rows: ReadonlyArray<DiaryRow>): DiaryDay {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  return {
    day: date.getUTCDate(),
    key: dayKey,
    rows,
    weekday: SHORT_WEEKDAYS[date.getUTCDay()] ?? '',
  };
}

/** A month as last built: its items (in list order), and its rows by key with the items each came from */
type BuiltMonth = Readonly<{
  items: ReadonlyArray<DiaryItem>;
  month: DiaryMonth;
  rows: ReadonlyMap<string, Readonly<{ items: DiaryItem[]; row: DiaryRow }>>;
  days: ReadonlyMap<string, DiaryDay>;
}>;

/** One month's items (any order) as days → rows; rows and days unchanged since `before` keep their objects */
function buildMonth(
  key: MonthKey,
  items: ReadonlyArray<DiaryItem>,
  dayKeyOf: (watchedAt: number) => string,
  years: Years | undefined,
  before: BuiltMonth | undefined,
): BuiltMonth {
  const days = new Map<string, Map<number, Draft>>();
  const seen = new Set<string>();
  let loaded = 0;
  for (const item of items) {
    const id = `${item.seriesId}:${item.seasonNumber}:${item.episodeNumber}:${item.watchedAt}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    loaded += 1;
    const dayKey = dayKeyOf(item.watchedAt);
    let shows = days.get(dayKey);
    if (!shows) {
      shows = new Map();
      days.set(dayKey, shows);
    }
    const draft = shows.get(item.seriesId);
    if (draft) {
      draft.items.push(item);
      draft.latest = Math.max(draft.latest, item.watchedAt);
    } else {
      shows.set(item.seriesId, { items: [item], latest: item.watchedAt });
    }
  }

  const builtRows = new Map<string, { items: DiaryItem[]; row: DiaryRow }>();
  const builtDays = new Map<string, DiaryDay>();
  const monthDays: DiaryDay[] = [];
  for (const dayKey of [...days.keys()].sort().reverse()) {
    const shows = days.get(dayKey) as Map<number, Draft>;
    const rows = [...shows.entries()]
      .sort(([idA, a], [idB, b]) => b.latest - a.latest || idA - idB)
      .map(([seriesId, draft]) => {
        const rowKey = `${dayKey}:${seriesId}`;
        const was = before?.rows.get(rowKey);
        const row =
          was && sameItems(was.items, draft.items)
            ? was.row
            : toRow(dayKey, draft);
        builtRows.set(rowKey, { items: draft.items, row });
        return row;
      });
    const wasDay = before?.days.get(dayKey);
    const day: DiaryDay =
      wasDay &&
      wasDay.rows.length === rows.length &&
      wasDay.rows.every((row, index) => row === rows[index])
        ? wasDay
        : toDay(dayKey, rows);
    builtDays.set(dayKey, day);
    monthDays.push(day);
  }

  const line = monthLine(key, years, loaded);
  const wasMonth = before?.month;
  const month: DiaryMonth =
    wasMonth &&
    wasMonth.line === line &&
    wasMonth.days.length === monthDays.length &&
    wasMonth.days.every((day, index) => day === monthDays[index])
      ? wasMonth
      : { days: monthDays, key, line, title: monthTitle(key) };
  return { days: builtDays, items, month, rows: builtRows };
}

/**
 * The diary as a list that grows by pages: every loaded episode
 * (any order, any number of pages, prepended months included) as months →
 * days → rows, newest first. A row is one show on one day; rows sort by
 * their latest watch. Pass `/stats/years` for the month lines (exact while a
 * month is partly loaded).
 *
 * Each call regroups only the months whose episodes changed since the last
 * one: a month, day or row that a page did not touch is the same object as
 * before (so `memo` skips it), and the same items give back the same list.
 * The local day of each `watchedAt` is worked out once per zone.
 */
export function createDiary() {
  let zone: string | null = null;
  const dayKeys = new Map<number, string>();
  let built = new Map<MonthKey, BuiltMonth>();
  let builtYears: Years | undefined;
  let last: ReadonlyArray<DiaryMonth> = [];

  return function diary(
    items: ReadonlyArray<DiaryItem>,
    years?: Years,
    timeZone = 'UTC',
  ): ReadonlyArray<DiaryMonth> {
    if (zone !== timeZone) {
      zone = timeZone;
      dayKeys.clear();
      built = new Map();
    }
    const dayKeyOf = (watchedAt: number) => {
      let key = dayKeys.get(watchedAt);
      if (key === undefined) {
        key = dayKeyIn(watchedAt, timeZone);
        dayKeys.set(watchedAt, key);
      }
      return key;
    };
    const byMonth = new Map<MonthKey, DiaryItem[]>();
    for (const item of items) {
      const key = dayKeyOf(item.watchedAt).slice(0, 7);
      const list = byMonth.get(key);
      if (list) {
        list.push(item);
      } else {
        byMonth.set(key, [item]);
      }
    }

    const sameYears = years === builtYears;
    builtYears = years;
    const next = new Map<MonthKey, BuiltMonth>();
    const months: DiaryMonth[] = [];
    for (const key of [...byMonth.keys()].sort().reverse()) {
      const monthItems = byMonth.get(key) as DiaryItem[];
      const before = built.get(key);
      const month =
        before && sameYears && sameItems(before.items, monthItems)
          ? before
          : buildMonth(key, monthItems, dayKeyOf, years, before);
      next.set(key, month);
      months.push(month.month);
    }
    built = next;
    if (
      last.length === months.length &&
      last.every((month, index) => month === months[index])
    ) {
      return last;
    }
    last = months;
    return months;
  };
}

/** The diary built once, from scratch (see `createDiary`) */
export function buildDiary(
  items: ReadonlyArray<DiaryItem>,
  years?: Years,
  timeZone = 'UTC',
): ReadonlyArray<DiaryMonth> {
  return createDiary()(items, years, timeZone);
}

/** Jump to: years with their totals, each with its months that have episodes */
export function monthIndex(years: Years): ReadonlyArray<JumpYear> {
  return years
    .filter((row) => row.episodes > 0)
    .map((row) => ({
      episodes: row.episodes,
      months: (row.months ?? [])
        .map((stats, month) => {
          const key = monthKeyOf(row.year, month);
          return {
            episodes: stats.episodes,
            key,
            label: MONTH_NAMES[month]?.slice(0, 3) ?? '',
            title: monthTitle(key),
          };
        })
        .filter((month) => month.episodes > 0)
        .reverse(),
      year: row.year,
    }));
}

/**
 * The month the diary opens at, read from Jump to's index: the newest month
 * with episodes, or after a jump (`from`) the newest one up to it. Null
 * when the index can't tell (a year without its months).
 */
export function openingMonth(
  index: ReadonlyArray<JumpYear>,
  from: MonthKey | null,
): MonthKey | null {
  const fromYear = from ? Number(from.slice(0, 4)) : null;
  for (const year of index) {
    if (fromYear !== null && year.year > fromYear) {
      continue;
    }
    if (year.months.length === 0) {
      return null;
    }
    // `YYYY-MM` keys sort as dates
    const month = from
      ? year.months.find((candidate) => candidate.key <= from)
      : year.months[0];
    if (month) {
      return month.key;
    }
  }
  return null;
}

/** The nearest newer month with episodes ("Newer: April 2024"), null at the newest */
export function newerMonth(
  key: MonthKey,
  index: ReadonlyArray<JumpYear>,
): Readonly<{ key: MonthKey; title: string }> | null {
  let newer: MonthKey | null = null;
  for (const year of index) {
    for (const month of year.months) {
      // `YYYY-MM` keys sort as dates
      if (month.key > key && (newer === null || month.key < newer)) {
        newer = month.key;
      }
    }
  }
  return newer ? { key: newer, title: monthTitle(newer) } : null;
}

/** `YYYY-MM-DD` of the Monday and the Sunday of the local week holding `now` */
const weekOf = (now: number, timeZone: string) => {
  const today = Date.parse(`${dayKeyIn(now, timeZone)}T00:00:00.000Z`);
  const sinceMonday = (new Date(today).getUTCDay() + 6) % 7;
  const monday = today - sinceMonday * DAY_MS;
  return {
    from: new Date(monday).toISOString().slice(0, 10),
    to: new Date(monday + 6 * DAY_MS).toISOString().slice(0, 10),
  };
};

/** The years whose daily counts this week needs: the previous one too across New Year */
export function weekYears(
  now: number,
  timeZone = 'UTC',
): ReadonlyArray<number> {
  const year = Number(dayKeyIn(now, timeZone).slice(0, 4));
  const mondayYear = Number(weekOf(now, timeZone).from.slice(0, 4));
  return mondayYear === year ? [year] : [year, mondayYear];
}

/** "This week · 1 episode · Wed 11": the local week so far from the daily counts (days in the same zone) */
export function thisWeek(
  days: StatsDaily['days'],
  now: number,
  timeZone = 'UTC',
): Readonly<{ episodes: number; last: string | null }> {
  const { from, to } = weekOf(now, timeZone);
  let episodes = 0;
  let last: string | null = null;
  for (const day of days) {
    if (day.date >= from && day.date <= to && day.episodes > 0) {
      episodes += day.episodes;
      if (last === null || day.date > last) {
        last = day.date;
      }
    }
  }
  if (last === null) {
    return { episodes, last };
  }
  const date = new Date(`${last}T00:00:00.000Z`);
  return {
    episodes,
    last: `${SHORT_WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()}`,
  };
}

/**
 * This week from the diary's first page (newest first), without the year's
 * daily counts: when the page reaches back before the local Monday, or is
 * the whole history (`hasMore` false), it holds every watch of the week.
 * Otherwise null: the caller reads the days. Regular episodes only, as the
 * daily counts are (specials never count in stats).
 */
export function thisWeekFromPage(
  items: ReadonlyArray<Pick<DiaryItem, 'seasonNumber' | 'watchedAt'>>,
  hasMore: boolean,
  now: number,
  timeZone = 'UTC',
): ReturnType<typeof thisWeek> | null {
  const { from } = weekOf(now, timeZone);
  const oldest = items.at(-1);
  const reachesBack =
    !hasMore ||
    (oldest !== undefined && dayKeyIn(oldest.watchedAt, timeZone) < from);
  if (!reachesBack) {
    return null;
  }
  const perDay = new Map<string, number>();
  for (const { seasonNumber, watchedAt } of items) {
    if (seasonNumber > 0) {
      const date = dayKeyIn(watchedAt, timeZone);
      perDay.set(date, (perDay.get(date) ?? 0) + 1);
    }
  }
  return thisWeek(
    [...perDay].map(([date, episodes]) => ({ date, episodes })),
    now,
    timeZone,
  );
}
