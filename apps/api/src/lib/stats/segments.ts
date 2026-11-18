/**
 * The segments of the stats page, as pure functions of a
 * year's watched items. No I/O: the callers read items, lists and zones.
 */

import type {
  ListItem,
  StatsDaily,
  StatsFinished,
  StatsNewOrBack,
  StatsNight,
  StatsSeriesRef,
  StatsShows,
  StatsWhen,
  StatsYears,
  WatchedItem,
} from '@tvseri.es/schemas';
import {
  buildPosterImageUrl,
  DAY_MS,
  dayKeyIn,
  todayUtc,
  yearWeekIndex,
  zonedParts,
} from '@tvseri.es/utils';

export type SegmentItem = Readonly<
  Pick<
    WatchedItem,
    | 'episodeNumber'
    | 'posterPath'
    | 'runtime'
    | 'seasonNumber'
    | 'seriesId'
    | 'slug'
    | 'title'
    | 'watchedAt'
  >
>;

const poster = (posterPath: string) =>
  posterPath ? buildPosterImageUrl(posterPath) : null;

const dayMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

type SeriesTotals = Readonly<{
  episodes: number;
  first: SegmentItem;
  runtimeMinutes: number;
  seasons: ReadonlySet<number>;
  firstWatchedAt: number;
  lastWatchedAt: number;
}>;

const totalsPerSeries = (items: ReadonlyArray<SegmentItem>) => {
  const totals = new Map<number, SeriesTotals>();
  for (const item of items) {
    const entry: SeriesTotals = totals.get(item.seriesId) ?? {
      episodes: 0,
      first: item,
      firstWatchedAt: item.watchedAt,
      lastWatchedAt: item.watchedAt,
      runtimeMinutes: 0,
      seasons: new Set<number>(),
    };
    totals.set(item.seriesId, {
      ...entry,
      episodes: entry.episodes + 1,
      firstWatchedAt: Math.min(entry.firstWatchedAt, item.watchedAt),
      lastWatchedAt: Math.max(entry.lastWatchedAt, item.watchedAt),
      runtimeMinutes: entry.runtimeMinutes + (item.runtime || 0),
      seasons: new Set([...entry.seasons, item.seasonNumber]),
    });
  }
  return totals;
};

/** Series × week, in the order first watched */
export const calculateShows = (
  items: ReadonlyArray<SegmentItem>,
  year: number,
): StatsShows => {
  const weeks = new Map<number, number[]>();
  for (const item of items) {
    const row = weeks.get(item.seriesId) ?? Array(53).fill(0);
    row[yearWeekIndex(item.watchedAt, year)] += 1;
    weeks.set(item.seriesId, row);
  }

  return {
    shows: [...totalsPerSeries(items)]
      .sort(([, a], [, b]) => a.firstWatchedAt - b.firstWatchedAt)
      .map(([id, entry]) => ({
        episodes: entry.episodes,
        firstWatchedAt: entry.firstWatchedAt,
        id,
        lastWatchedAt: entry.lastWatchedAt,
        posterImage: poster(entry.first.posterPath),
        runtimeMinutes: entry.runtimeMinutes,
        slug: entry.first.slug,
        title: entry.first.title,
        weeks: weeks.get(id) ?? [],
      })),
  };
};

/** The shows that reached Finished in the year, with what was watched of them in it */
export const calculateFinished = (
  items: ReadonlyArray<SegmentItem>,
  finished: ReadonlyArray<ListItem>,
): StatsFinished => {
  const totals = totalsPerSeries(items);
  const shows = finished
    .map((show) => {
      const entry = totals.get(show.id);
      return {
        episodes: entry?.episodes ?? 0,
        finishedAt: show.createdAt ?? 0,
        id: show.id,
        posterImage: show.posterImage ?? null,
        runtimeMinutes: entry?.runtimeMinutes ?? 0,
        seasons: [...(entry?.seasons ?? [])].sort((a, b) => a - b),
        slug: show.slug,
        title: show.title,
      };
    })
    .sort((a, b) => b.finishedAt - a.finishedAt);

  return { count: shows.length, shows };
};

/**
 * Per-day counts, the busiest day and week, and the longest run of days, in
 * the user's zone (a watch's day is the same in History, This week and
 * the episode modal; an import at local midnight was the day before in UTC).
 * The answer names its zone.
 */
export const calculateDaily = (
  items: ReadonlyArray<SegmentItem>,
  timeZone = 'UTC',
): StatsDaily => {
  const perDay = new Map<string, number>();
  for (const item of items) {
    const date = dayKeyIn(item.watchedAt, timeZone);
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
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
    // Monday of the day's week
    const weekday = (new Date(dayMs(date)).getUTCDay() + 6) % 7;
    const monday = todayUtc(dayMs(date) - weekday * DAY_MS);
    perWeek.set(monday, (perWeek.get(monday) ?? 0) + episodes);
  }
  const busiestWeek = [...perWeek]
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce<StatsDaily['busiestWeek']>(
      (best, [from, episodes]) =>
        !best || episodes > best.episodes
          ? { episodes, from, to: todayUtc(dayMs(from) + 6 * DAY_MS) }
          : best,
      null,
    );

  let longest: StatsDaily['longestStreak'] = null;
  let run = { days: 0, from: '', to: '' };
  for (const { date } of days) {
    run =
      run.days > 0 && dayMs(date) - dayMs(run.to) === DAY_MS
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
    timeZone,
  };
};

// An episode before this local hour belongs to the evening before
const NIGHT_ENDS_AT_HOUR = 5;

const toNight = (
  date: string,
  items: ReadonlyArray<SegmentItem>,
): StatsNight => ({
  date,
  episodes: items.length,
  items: items.map((item) => ({
    episodeNumber: item.episodeNumber,
    seasonNumber: item.seasonNumber,
    seriesId: item.seriesId,
    slug: item.slug,
    title: item.title,
  })),
  runtimeMinutes: items.reduce((sum, item) => sum + (item.runtime || 0), 0),
});

/** Daytime is 06:00 to 18:00 local ("Daytime mostly on weekends") */
const DAY_STARTS_AT_HOUR = 6;
const DAY_ENDS_AT_HOUR = 18;

/**
 * Hour-of-day, weekday and the biggest nights, in the user's zone. Items that
 * share a timestamp with another were marked watched in bulk (Mark season
 * writes one time for all): they say nothing about when anyone watched, so
 * they are left out.
 */
export const calculateWhen = (
  items: ReadonlyArray<SegmentItem>,
  timeZone: string,
): StatsWhen => {
  const perTimestamp = new Map<number, number>();
  for (const item of items) {
    perTimestamp.set(
      item.watchedAt,
      (perTimestamp.get(item.watchedAt) ?? 0) + 1,
    );
  }
  const counted = items
    .filter((item) => perTimestamp.get(item.watchedAt) === 1)
    .sort((a, b) => a.watchedAt - b.watchedAt);

  const hours = Array<number>(24).fill(0);
  const weekdays = Array<number>(7).fill(0);
  const daytime = { weekday: 0, weekend: 0 };
  const nights = new Map<string, SegmentItem[]>();
  for (const item of counted) {
    const local = zonedParts(item.watchedAt, timeZone);
    hours[local.hour]! += 1;
    weekdays[local.weekday]! += 1;
    if (local.hour >= DAY_STARTS_AT_HOUR && local.hour < DAY_ENDS_AT_HOUR) {
      daytime[local.weekday >= 5 ? 'weekend' : 'weekday'] += 1;
    }
    const evening = dayKeyIn(
      item.watchedAt - NIGHT_ENDS_AT_HOUR * 60 * 60 * 1000,
      timeZone,
    );
    nights.set(evening, [...(nights.get(evening) ?? []), item]);
  }

  const ranked = [...nights]
    .sort(
      ([dateA, a], [dateB, b]) =>
        b.length - a.length || dateA.localeCompare(dateB),
    )
    .map(([date, nightItems]) => toNight(date, nightItems));

  return {
    biggestNight: ranked[0] ?? null,
    bulkExcluded: items.length - counted.length,
    daytime,
    episodes: counted.length,
    hours,
    otherNights: ranked.slice(1, 4),
    timeZone,
    weekdays,
  };
};

/** Series first watched ever in the year, and series seen before it */
export const calculateNewOrBack = (
  items: ReadonlyArray<SegmentItem>,
  firstWatch: ReadonlyMap<number, number>,
  year: number,
): StatsNewOrBack => {
  const start = Date.parse(`${year}-01-01T00:00:00.000Z`);
  const ranked = [...totalsPerSeries(items)].sort(
    ([, a], [, b]) => b.runtimeMinutes - a.runtimeMinutes,
  );
  const split: { new: StatsSeriesRef[]; back: StatsSeriesRef[] } = {
    back: [],
    new: [],
  };

  for (const [id, entry] of ranked) {
    const ref = {
      id,
      posterImage: poster(entry.first.posterPath),
      slug: entry.first.slug,
      title: entry.first.title,
    };
    ((firstWatch.get(id) ?? entry.firstWatchedAt) >= start
      ? split.new
      : split.back
    ).push(ref);
  }
  return split;
};

export type AllTimeItem = Readonly<
  Pick<WatchedItem, 'seriesId' | 'watchedAt' | 'dateUnknown'> &
    Partial<Pick<WatchedItem, 'runtime' | 'seasonNumber'>>
>;

/** What the all-time segment keeps: episodes per year and the first watch per series */
export type AllTimeStats = Readonly<{
  years: StatsYears['years'];
  /** The zone the years and months are counted in */
  timeZone: string;
  /** Regular episodes marked "I don't remember" */
  undated: number;
  firstWatch: ReadonlyArray<readonly [seriesId: number, watchedAt: number]>;
}>;

const emptyMonths = () =>
  Array.from({ length: 12 }, () => ({ episodes: 0, minutes: 0 }));

/**
 * Years with dated regular episodes, each with its 12 months (in the user's
 * zone) of episodes and their minutes, the undated regular episodes, and the
 * first-ever regular watch per series. Season 0 never counts (countsInStats).
 */
export const calculateAllTime = (
  items: ReadonlyArray<AllTimeItem>,
  timeZone = 'UTC',
): AllTimeStats => {
  const perYear = new Map<
    number,
    { episodes: number; months: Array<{ episodes: number; minutes: number }> }
  >();
  const first = new Map<number, number>();
  let undated = 0;
  for (const item of items) {
    if ((item.seasonNumber ?? 1) === 0) {
      continue;
    }
    if (item.dateUnknown) {
      undated += 1;
      continue;
    }
    const local = dayKeyIn(item.watchedAt, timeZone);
    const year = Number(local.slice(0, 4));
    const row = perYear.get(year) ?? { episodes: 0, months: emptyMonths() };
    row.episodes += 1;
    const month = row.months[Number(local.slice(5, 7)) - 1]!;
    month.episodes += 1;
    month.minutes += item.runtime ?? 0;
    perYear.set(year, row);
    first.set(
      item.seriesId,
      Math.min(first.get(item.seriesId) ?? item.watchedAt, item.watchedAt),
    );
  }
  return {
    firstWatch: [...first].sort(([a], [b]) => a - b),
    timeZone,
    undated,
    years: [...perYear]
      .map(([year, { episodes, months }]) => ({ episodes, months, year }))
      .sort((a, b) => b.year - a.year),
  };
};

type Spotted = Readonly<{
  episodeNumber: number;
  seasonNumber: number;
  watchedAt: number;
}>;

/**
 * The year's first or last watch from a few items read from that end:
 * the earliest or the latest `watchedAt`, and among items marked in one go
 * (one time) the lowest episode first, the highest last, as Home's "Last
 * watched".
 */
export const spotlightItem = <T extends Spotted>(
  items: ReadonlyArray<T>,
  end: 'first' | 'last',
): T | undefined => {
  const sign = end === 'last' ? 1 : -1;
  let best: T | undefined;
  for (const item of items) {
    const order = best
      ? item.watchedAt - best.watchedAt ||
        item.seasonNumber - best.seasonNumber ||
        item.episodeNumber - best.episodeNumber
      : 1;
    if (!best || order * sign > 0) {
      best = item;
    }
  }
  return best;
};
