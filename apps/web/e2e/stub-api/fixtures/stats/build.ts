/** Turns the raw year data into the API bodies (shapes from `@tvseri.es/schemas`). */
import type {
  StatsDaily,
  StatsFinished,
  StatsFinishedShow,
  StatsNewOrBack,
  StatsNight,
  StatsSeriesRef,
  StatsShowRow,
  StatsShows,
  StatsSpotlight,
  StatsSpotlightItem,
  StatsSummary,
  StatsWatchedSeriesItem,
  StatsWeeklyItem,
  StatsWhen,
  StatsYears,
} from '@tvseri.es/schemas';
import {
  backdropColorOf,
  backdropOf,
  imgUrl,
  logoOf,
  posterOf,
} from './images';
import {
  COUNTRIES,
  FAVORITES,
  GENRES,
  METRICS,
  providers,
  ZERO_METRICS,
} from './meta';
import { raw2024 } from './raw2024';
import { raw2025 } from './raw2025';
import { raw2026 } from './raw2026';
import { getSeries } from './series';
import type { YearRaw } from './types';

const RAW: Readonly<Record<number, YearRaw>> = {
  2024: raw2024,
  2025: raw2025,
  2026: raw2026,
};

/** A time of day when the stub's episodes were watched (UTC, evening) */
const at = (date: string) => Date.parse(`${date}T20:00:00.000Z`);

export type StatsWhenWithDaytime = StatsWhen &
  Readonly<{
    /** Episodes 06:00 to 18:00 local, by weekday or weekend */
    daytime?: Readonly<{ weekday: number; weekend: number }>;
  }>;

const YEARS_WITH_DATA = [2026, 2025, 2024] as const;

export const years = (): StatsYears => ({
  years: YEARS_WITH_DATA.map((year) => ({
    episodes: METRICS[year]?.episodeCount ?? 0,
    year,
  })),
});

const ref = (id: number): StatsSeriesRef => {
  const series = getSeries(id);
  return {
    id,
    posterImage: posterOf(series.art),
    slug: series.slug,
    title: series.title,
  };
};

const weekly = (raw: YearRaw | undefined): StatsWeeklyItem[] =>
  Array.from({ length: 53 }, (_, index) => {
    const totalRuntime = raw?.weeklyRuntime[index] ?? 0;
    return {
      episodes: raw?.weekly[index] ?? 0,
      runtimeHours: Math.round((totalRuntime / 60) * 10) / 10,
      totalRuntime,
      week: index + 1,
    };
  });

const spotlightItem = (
  id: number,
  date: string,
  season: number,
  episode: number,
  title: string,
  runtime: number,
  logoName: string,
): StatsSpotlightItem => {
  const series = getSeries(id);
  return {
    episode: {
      episodeNumber: episode,
      runtime,
      seasonNumber: season,
      stillImage: null,
      title,
    },
    tvSeries: {
      backdropColor: backdropColorOf(series.art),
      backdropImage: backdropOf(series.art),
      id,
      posterImage: posterOf(series.art),
      slug: series.slug,
      title: series.title,
      titleTreatmentImage: logoOf(series.art),
    },
    watchedAt: Date.parse(`${date}T21:04:00.000Z`),
    watchProviderLogo: imgUrl(logoName),
  };
};

const spotlight = (year: number, raw: YearRaw | undefined): StatsSpotlight => {
  if (!raw) {
    return { first: null, last: null };
  }
  if (year === 2025) {
    return {
      first: spotlightItem(
        9001,
        '2025-01-04',
        1,
        1,
        'Episode 1',
        59,
        'st_prov_iplayer.png',
      ),
      last: spotlightItem(
        9019,
        '2025-12-31',
        3,
        1,
        'Tie Goes to the Runner',
        58,
        'st_prov_plex.jpg',
      ),
    };
  }
  const first = raw.shows.reduce((a, b) => (b.first < a.first ? b : a));
  const last = raw.shows.reduce((a, b) => (b.last >= a.last ? b : a));
  return {
    first: spotlightItem(
      first.id,
      first.first,
      1,
      1,
      'Episode 1',
      getSeries(first.id).epRuntime,
      'st_prov_netflix.png',
    ),
    last: spotlightItem(
      last.id,
      last.last,
      1,
      last.episodes,
      `Episode ${last.episodes}`,
      getSeries(last.id).epRuntime,
      'st_prov_plex.jpg',
    ),
  };
};

const shows = (raw: YearRaw | undefined): StatsShows => ({
  shows: (raw?.shows ?? []).map((show): StatsShowRow => {
    const series = getSeries(show.id);
    return {
      episodes: show.episodes,
      firstWatchedAt: at(show.first),
      id: show.id,
      lastWatchedAt: at(show.last),
      posterImage: posterOf(series.art),
      runtimeMinutes: show.runtimeMinutes,
      slug: series.slug,
      title: series.title,
      weeks: show.weeks,
    };
  }),
});

const finished = (raw: YearRaw | undefined): StatsFinished => ({
  count: raw?.finished.length ?? 0,
  shows: (raw?.finished ?? []).map((item): StatsFinishedShow => {
    const series = getSeries(item.id);
    return {
      episodes: item.eps,
      finishedAt: at(item.last),
      id: item.id,
      posterImage: posterOf(series.art),
      runtimeMinutes: item.runtime,
      seasons: item.seasons,
      slug: series.slug,
      title: series.title,
    };
  }),
});

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

const daily = (raw: YearRaw | undefined): StatsDaily => {
  if (!raw || raw.days.length === 0) {
    return {
      activeDays: 0,
      busiestDay: null,
      busiestWeek: null,
      days: [],
      longestStreak: null,
    };
  }
  let busiest = raw.days[0] as readonly [string, number];
  for (const day of raw.days) {
    if (day[1] > busiest[1]) {
      busiest = day;
    }
  }
  // Monday to Sunday weeks, only counting the year's own days
  const perWeek = new Map<string, number>();
  for (const [date, episodes] of raw.days) {
    const weekday = (new Date(`${date}T12:00:00.000Z`).getUTCDay() + 6) % 7;
    const monday = addDays(date, -weekday);
    perWeek.set(monday, (perWeek.get(monday) ?? 0) + episodes);
  }
  let bestWeek: readonly [string, number] = ['', 0];
  for (const entry of perWeek) {
    if (entry[1] > bestWeek[1]) {
      bestWeek = entry;
    }
  }
  let best: { days: number; from: string; to: string } | null = null;
  let current: { days: number; from: string; to: string } | null = null;
  for (const [date] of raw.days) {
    current =
      current && addDays(current.to, 1) === date
        ? { days: current.days + 1, from: current.from, to: date }
        : { days: 1, from: date, to: date };
    if (!best || current.days > best.days) {
      best = current;
    }
  }
  return {
    activeDays: raw.days.length,
    busiestDay: { date: busiest[0], episodes: busiest[1] },
    busiestWeek: {
      episodes: bestWeek[1],
      from: bestWeek[0],
      to: addDays(bestWeek[0], 6),
    },
    days: raw.days.map(([date, episodes]) => ({ date, episodes })),
    longestStreak: best,
  };
};

const night = (item: YearRaw['nights'][number]): StatsNight => {
  const series = getSeries(item.id);
  return {
    date: item.date,
    episodes: item.n,
    items: Array.from({ length: item.n }, (_, index) => ({
      episodeNumber: item.from + index,
      seasonNumber: item.season,
      seriesId: item.id,
      slug: series.slug,
      title: series.title,
    })),
    runtimeMinutes: item.n * series.epRuntime,
  };
};

const when = (raw: YearRaw | undefined): StatsWhenWithDaytime => {
  if (!raw) {
    return {
      biggestNight: null,
      bulkExcluded: 0,
      daytime: { weekday: 0, weekend: 0 },
      episodes: 0,
      hours: Array.from({ length: 24 }, () => 0),
      otherNights: [],
      timeZone: 'Europe/London',
      weekdays: Array.from({ length: 7 }, () => 0),
    };
  }
  const [biggest, ...others] = raw.nights;
  return {
    biggestNight: biggest ? night(biggest) : null,
    bulkExcluded: raw.when.bulkExcluded,
    daytime: raw.when.daytime,
    episodes: raw.when.episodes,
    hours: raw.when.hours,
    otherNights: others.slice(0, 3).map(night),
    timeZone: 'Europe/London',
    weekdays: raw.when.weekdays,
  };
};

const newOrBack = (raw: YearRaw | undefined): StatsNewOrBack => ({
  back: (raw?.backIds ?? []).map(ref),
  new: (raw?.newIds ?? []).map(ref),
});

const watchedSeries = (raw: YearRaw | undefined): StatsWatchedSeriesItem[] =>
  (raw?.shows ?? []).map(({ id }) => {
    const series = getSeries(id);
    return {
      id,
      posterImage: posterOf(series.art),
      slug: series.slug,
      title: series.title,
    };
  });

const summary = (year: number): StatsSummary => ({
  current: METRICS[year] ?? ZERO_METRICS,
  previous: METRICS[year - 1] ?? ZERO_METRICS,
});

/** One `:segment` of `/user/:id/stats/:year/:segment`; unknown years answer the empty shape. */
export const segment = (
  year: number,
  name: string,
): Readonly<Record<string, unknown>> | readonly unknown[] | undefined => {
  const raw = RAW[year];
  switch (name) {
    case 'summary':
      return summary(year);
    case 'favorites-count':
      return FAVORITES[year] ?? { current: 0, previous: 0 };
    case 'spotlight':
      return spotlight(year, raw);
    case 'weekly':
      return weekly(raw);
    case 'genres':
      return GENRES[year] ?? [];
    case 'providers':
      return providers(year);
    case 'countries':
      return COUNTRIES[year] ?? {};
    case 'watched-series':
      return watchedSeries(raw);
    case 'shows':
      return shows(raw);
    case 'finished':
      return finished(raw);
    case 'daily':
      return daily(raw);
    case 'when':
      return when(raw);
    case 'new-or-back':
      return newOrBack(raw);
    default:
      return undefined;
  }
};
