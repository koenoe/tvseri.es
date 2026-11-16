import type {
  StatsDaily,
  StatsMonth,
  StatsYears,
  WatchedItem,
} from '@tvseri.es/schemas';

import { historyOf } from './library.ts';
import { fakeId, type PersonName } from './people.ts';
import { heavyShows } from './pg-library.ts';
import { seeded } from './pg-shows.ts';
import type { ProfileShow } from './shows.ts';

/**
 * History data: the heavy profile's diary, the range-aware
 * `GET /user/:id/watched` page, and `/stats/years` (with `months` and
 * `undated`) and `/stats/:year/daily` computed from a person's history.
 *
 * The heavy diary: 6,000 dated episodes from January 2024 to August 2026
 * (the newer, relative history of `heavy.ts` sits above it), among them
 * specials (season 0, which the months leave out), a 36-episode bulk day
 * (one `watchedAt`, 14 Jun 2025), an 8-episode binge (6 Dec 2025), a
 * four-show day (2 Aug 2026), a month with nothing (February 2025) and a
 * 300-episode month (March 2024: three reads of 100). Deterministic.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Regular episodes marked "I don't remember" (no date, not in any list read) */
export const UNDATED: Partial<Record<PersonName, number>> = {
  alex: 23,
  'marathonwatcher-2026': 600,
  seenit: 18,
};

/**
 * Opt-in, for scroll measurements only (`STUB_DIARY_EXTRA_YEARS=2`): whole
 * years of 190-episode months before 2024, so the diary passes 3,000 rows.
 * Unset, the diary is the one the specs describe.
 */
const EXTRA_YEARS = Math.max(
  0,
  Math.floor(Number(process.env.STUB_DIARY_EXTRA_YEARS) || 0),
);

const HEAVY_DATED = 6_000 + EXTRA_YEARS * 12 * 190;

type Event = {
  at: number;
  show: ProfileShow;
  count: number;
  /** every episode shares `at` ("Marked in one go") */
  bulk?: boolean;
  special?: boolean;
};

const MONTHS: ReadonlyArray<readonly [number, number]> = Array.from(
  { length: 32 + EXTRA_YEARS * 12 },
  (_, index) =>
    [2024 - EXTRA_YEARS + Math.floor(index / 12), index % 12] as const,
);

const monthTarget = (year: number, month: number) =>
  year === 2024 && month === 2 ? 300 : year === 2025 && month === 1 ? 0 : 190;

const buildEvents = (): Event[] => {
  const random = seeded(6000);
  const { finished, inProgress } = heavyShows();
  const pool = [...finished, ...inProgress];
  const pick = () => pool[Math.floor(random() * pool.length)]!;
  const events: Event[] = [];

  const fixed: ReadonlyArray<Event> = [
    {
      at: Date.UTC(2025, 5, 14, 21),
      bulk: true,
      count: 36,
      show: finished[3]!,
    },
    { at: Date.UTC(2025, 11, 6, 13), count: 8, show: finished[7]! },
    ...[0, 1, 2, 3].map(
      (index): Event => ({
        at: Date.UTC(2026, 7, 2, 18 + index),
        count: 1 + index,
        show: inProgress[index]!,
      }),
    ),
  ];

  for (const [year, month] of MONTHS) {
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const own = fixed.filter((event) => {
      const date = new Date(event.at);
      return date.getUTCFullYear() === year && date.getUTCMonth() === month;
    });
    events.push(...own);
    let left =
      monthTarget(year, month) -
      own.reduce((sum, event) => sum + event.count, 0);
    // the four-show day stays four shows: no other events on it
    const busy = new Set(own.map((event) => new Date(event.at).getUTCDate()));
    while (left > 0) {
      const day = 1 + Math.floor(random() * days);
      if (busy.has(day)) {
        continue;
      }
      const shows = 1 + Math.floor(random() * 3);
      for (let index = 0; index < shows && left > 0; index++) {
        const count = Math.min(left, 1 + Math.floor(random() * 5));
        events.push({
          at: Date.UTC(
            year,
            month,
            day,
            18 + index * 2,
            Math.floor(random() * 50),
          ),
          count,
          show: pick(),
          special: count === 1 && random() < 0.08,
        });
        left -= count;
      }
    }
  }
  return events.sort((a, b) => a.at - b.at);
};

const item = (
  show: ProfileShow,
  season: number,
  episode: number,
  watchedAt: number,
): WatchedItem => ({
  episodeNumber: episode,
  episodeStillImage: show.backdrop,
  episodeTitle: season === 0 ? `Special ${episode}` : `Episode ${episode}`,
  posterImage: show.poster,
  posterPath: show.poster ? `/${show.poster.split('/').pop()}` : '',
  runtime: show.runtime,
  seasonNumber: season,
  seriesId: show.id,
  slug: show.slug || `show-${show.id}`,
  title: show.title,
  userId: fakeId('marathonwatcher-2026'),
  watchedAt,
});

let diary: ReadonlyArray<WatchedItem> | null = null;

/** The heavy diary, newest first (episodes of one show in code order, latest first) */
export const heavyDiary = (): ReadonlyArray<WatchedItem> => {
  if (diary) {
    return diary;
  }
  const next = new Map<number, number>();
  const specials = new Map<number, number>();
  const items: WatchedItem[] = [];
  for (const event of buildEvents()) {
    const { show } = event;
    if (event.special) {
      const number = (specials.get(show.id) ?? 0) + 1;
      specials.set(show.id, number);
      items.push(item(show, 0, number, event.at));
      continue;
    }
    const perSeason = Math.max(1, Math.ceil(show.episodes / show.seasons));
    for (let index = 0; index < event.count; index++) {
      const n = next.get(show.id) ?? 0;
      next.set(show.id, n + 1);
      items.push(
        item(
          show,
          Math.floor(n / perSeason) + 1,
          (n % perSeason) + 1,
          event.bulk ? event.at : event.at + index * 47 * 60_000,
        ),
      );
    }
  }
  if (items.length !== HEAVY_DATED) {
    throw new Error(`heavy diary: ${items.length} episodes`);
  }
  diary = items.sort(
    (a, b) =>
      b.watchedAt - a.watchedAt ||
      b.seasonNumber - a.seasonNumber ||
      b.episodeNumber - a.episodeNumber,
  );
  return diary;
};

// ── GET /user/:id/watched ───────────────────────────────────────────────

/** A person's whole dated history, newest first (the heavy one: its diary under the recent rows) */
export const historyItems = (name: PersonName): ReadonlyArray<WatchedItem> =>
  name === 'marathonwatcher-2026'
    ? [...historyOf(name), ...heavyDiary()].sort(
        (a, b) => b.watchedAt - a.watchedAt,
      )
    : historyOf(name);

type PageResult =
  | Readonly<{ items: ReadonlyArray<WatchedItem>; nextCursor: string | null }>
  | Readonly<{ error: string }>;

const parseDate = (value: string | null): number | null | undefined => {
  if (!value) {
    return undefined;
  }
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : at;
};

/**
 * As the API pages history: newest first (`sort_direction=asc` flips it),
 * `limit` clamped to 1..100 (default 20), a range only when both
 * `start_date` and `end_date` are set (inclusive), the cursor valid with the
 * same range. The cursor here is an offset (the API's is opaque).
 */
export const watchedPage = (
  all: ReadonlyArray<WatchedItem>,
  query: URLSearchParams,
): PageResult => {
  const start = parseDate(query.get('start_date'));
  const end = parseDate(query.get('end_date'));
  if (start === null || end === null) {
    return { error: 'Invalid date' };
  }
  const limitParam = Number.parseInt(query.get('limit') ?? '', 10);
  const limit = Number.isNaN(limitParam)
    ? 20
    : Math.min(Math.max(limitParam, 1), 100);
  const cursor = query.get('cursor');
  const offset = cursor ? Number(cursor) : 0;
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return { error: 'Invalid cursor' };
  }
  const ranged =
    start !== undefined && end !== undefined
      ? all.filter((item) => item.watchedAt >= start && item.watchedAt <= end)
      : all;
  const ordered =
    query.get('sort_direction') === 'asc' ? [...ranged].reverse() : ranged;
  const next = offset + limit;
  return {
    items: ordered.slice(offset, next),
    nextCursor: next < ordered.length ? String(next) : null,
  };
};

// ── /stats/years and /stats/:year/daily ─────────────────────────────────

/** Years with dated episodes (specials count), months of regular ones, undated */
export const statsYears = (
  items: ReadonlyArray<WatchedItem>,
  undated: number,
): StatsYears => {
  const years = new Map<number, { episodes: number; months: StatsMonth[] }>();
  for (const watched of items) {
    const date = new Date(watched.watchedAt);
    const year = date.getUTCFullYear();
    const row = years.get(year) ?? {
      episodes: 0,
      months: Array.from({ length: 12 }, () => ({ episodes: 0, minutes: 0 })),
    };
    row.episodes += 1;
    if (watched.seasonNumber > 0) {
      const month = row.months[date.getUTCMonth()]!;
      row.months[date.getUTCMonth()] = {
        episodes: month.episodes + 1,
        minutes: month.minutes + (watched.runtime || 0),
      };
    }
    years.set(year, row);
  }
  return {
    undated,
    years: [...years]
      .map(([year, row]) => ({ ...row, year }))
      .sort((a, b) => b.year - a.year),
  };
};

const isoDay = (at: number) => new Date(at).toISOString().slice(0, 10);

/** As the API's `calculateDaily`: UTC days, Monday-to-Sunday weeks */
export const statsDaily = (
  items: ReadonlyArray<WatchedItem>,
  year: number,
): StatsDaily => {
  const perDay = new Map<string, number>();
  for (const watched of items) {
    if (new Date(watched.watchedAt).getUTCFullYear() === year) {
      const date = isoDay(watched.watchedAt);
      perDay.set(date, (perDay.get(date) ?? 0) + 1);
    }
  }
  const days = [...perDay]
    .map(([date, episodes]) => ({ date, episodes }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const busiestDay = days.reduce<StatsDaily['busiestDay']>(
    (best, day) => (!best || day.episodes > best.episodes ? day : best),
    null,
  );
  const perWeek = new Map<string, number>();
  for (const { date, episodes } of days) {
    const at = Date.parse(`${date}T00:00:00Z`);
    const monday = isoDay(at - ((new Date(at).getUTCDay() + 6) % 7) * DAY);
    perWeek.set(monday, (perWeek.get(monday) ?? 0) + episodes);
  }
  const busiestWeek = [...perWeek]
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce<StatsDaily['busiestWeek']>(
      (best, [from, episodes]) =>
        !best || episodes > best.episodes
          ? {
              episodes,
              from,
              to: isoDay(Date.parse(`${from}T00:00:00Z`) + 6 * DAY),
            }
          : best,
      null,
    );
  let longest: StatsDaily['longestStreak'] = null;
  let run = { days: 0, from: '', to: '' };
  for (const { date } of days) {
    run =
      run.days > 0 &&
      Date.parse(`${date}T00:00:00Z`) - Date.parse(`${run.to}T00:00:00Z`) ===
        DAY
        ? { ...run, days: run.days + 1, to: date }
        : { days: 1, from: date, to: date };
    if (!longest || run.days > longest.days) {
      longest = run;
    }
  }
  return {
    activeDays: days.length,
    busiestDay,
    busiestWeek,
    days,
    longestStreak: longest,
  };
};
