import type {
  LibraryIds,
  StatsGenreItem,
  StatsProviderItem,
  StatsSummary,
  StatsWeeklyItem,
  WatchedItem,
} from '@tvseri.es/schemas';

import { HEAVY_LIBRARY, heavyHistoryKeys, MIRA_LIBRARY } from './heavy.ts';
import { fakeId, type PersonName } from './people.ts';
import { bulkKeys, listItem, type ShowKey, showOf } from './shows.ts';
import { daysAgo } from './time.ts';

/**
 * Lists, history and this year's stats per person. Lists are newest first,
 * as the API sorts them by default.
 */

export type ListName = 'favorites' | 'in_progress' | 'watched' | 'watchlist';

export const LIST_NAMES: ReadonlyArray<ListName> = [
  'favorites',
  'in_progress',
  'watched',
  'watchlist',
];

type Library = Readonly<Record<ListName, ReadonlyArray<ShowKey>>>;

const LIBRARIES: Readonly<Partial<Record<PersonName, Library>>> = {
  alex: {
    favorites: [
      'tyson',
      'dark',
      'severance',
      'shogun',
      'pitt',
      'mobland',
      'whiteLotus',
      // a long tail with long titles: a favourites page of 20 and one more
      ...bulkKeys(0, 17),
    ],
    in_progress: [
      'dexter',
      'gildedAge',
      'blackDoves',
      'shogun',
      'theChosen',
      'midsomer',
      'ringsOfPower',
      'lastOfUs',
      'whiteLotus',
    ],
    watched: [
      'tyson',
      'severance',
      'pitt',
      'wednesday',
      'mobland',
      'mcmafia',
      ...bulkKeys(10, 36),
    ],
    watchlist: [
      'mobland',
      'frieren',
      'witchHat',
      'xmen',
      'haikyu',
      'ringsOfPower',
      ...bulkKeys(5, 40),
    ],
  },
  ivo: {
    favorites: ['frieren'],
    in_progress: ['witchHat'],
    watched: ['mcmafia'],
    watchlist: [],
  },
  juno: {
    favorites: ['pitt', 'dark', 'frieren', 'shogun', 'severance'],
    in_progress: ['haikyu', 'witchHat', 'xmen', 'dexter', 'blackDoves'],
    watched: ['pitt', 'severance', 'mcmafia', 'shogun', 'frieren'],
    watchlist: ['wednesday', 'lastOfUs', 'gildedAge', 'tyson', 'midsomer'],
  },
  'marathonwatcher-2026': HEAVY_LIBRARY,
  mira: MIRA_LIBRARY,
  sam: {
    favorites: ['marathon'],
    in_progress: ['marathon', 'theChosen'],
    watched: [],
    watchlist: [],
  },
  wren: {
    favorites: ['dark', 'severance'],
    in_progress: ['mobland'],
    watched: ['mcmafia', 'severance', 'pitt'],
    watchlist: [],
  },
};

const libraryOf = (name: PersonName): Library =>
  LIBRARIES[name] ?? {
    favorites: [],
    in_progress: [],
    watched: [],
    watchlist: [],
  };

/** Every item of a list, newest first, with the `createdAt` the list routes give it */
export const listItems = (name: PersonName, list: ListName) =>
  (libraryOf(name)[list] ?? []).map((key, index) =>
    listItem(key, daysAgo(index * 9 + 1)),
  );

/** A list page as `GET /user/:id/list/:list` returns it */
export const listPage = (
  name: PersonName,
  list: string,
  cursor: string | null = null,
  limit = 20,
) => {
  const items = LIST_NAMES.includes(list as ListName)
    ? listItems(name, list as ListName)
    : [];
  const start = cursor ? Number(cursor) : 0;
  const next = start + limit;
  return {
    items: items.slice(start, next),
    nextCursor: next < items.length ? String(next) : null,
  };
};

/** The sidebar's Watchlist count (42) */
export const listCount = (name: PersonName, list: string): number => {
  const shown = (libraryOf(name)[list as ListName] ?? []).length;
  if (name === 'alex' && list === 'watchlist') return 42;
  if (name === 'alex' && list === 'favorites') return 98;
  if (name === 'juno' && list === 'watchlist') return 31;
  if (name === 'juno' && list === 'favorites') return 86;
  if (name === 'marathonwatcher-2026' && list === 'watchlist') return 1287;
  if (name === 'marathonwatcher-2026' && list === 'favorites') return 312;
  return shown;
};

export const libraryIds = (name: PersonName): LibraryIds => {
  const lib = libraryOf(name);
  const ids = (keys: ReadonlyArray<ShowKey>) =>
    keys.map((key) => showOf(key).id);
  return {
    favorites: ids(lib.favorites),
    inProgress: ids(lib.in_progress),
    watched: ids(lib.watched),
    watchlist: ids(lib.watchlist),
  };
};

const watched = (
  name: PersonName,
  key: ShowKey,
  season: number,
  episode: number,
  watchedAt: number,
  title = `Episode ${episode}`,
): WatchedItem => {
  const s = showOf(key);
  return {
    episodeNumber: episode,
    episodeStillImage: s.backdrop,
    episodeTitle: title,
    posterImage: s.poster,
    posterPath: `/${s.poster.split('/').pop() ?? ''}`,
    runtime: s.runtime,
    seasonNumber: season,
    seriesId: s.id,
    slug: s.slug,
    title: s.title,
    userId: fakeId(name),
    watchedAt,
  };
};

/** alex's history, newest first (a stack of 3 and of 2) */
const HISTORY: Readonly<Partial<Record<PersonName, () => WatchedItem[]>>> = {
  alex: () => [
    watched('alex', 'dexter', 2, 1, daysAgo(1, 22), 'A Beating Heart'),
    watched('alex', 'blackDoves', 2, 5, daysAgo(5, 23)),
    watched('alex', 'blackDoves', 2, 4, daysAgo(5, 22)),
    watched('alex', 'blackDoves', 2, 3, daysAgo(5, 21)),
    watched('alex', 'gildedAge', 4, 1, daysAgo(7)),
    watched('alex', 'wednesday', 2, 8, daysAgo(10, 22)),
    watched('alex', 'wednesday', 2, 7, daysAgo(10, 21)),
    watched('alex', 'severance', 2, 10, daysAgo(19)),
    watched('alex', 'midsomer', 25, 6, daysAgo(22)),
    watched('alex', 'ringsOfPower', 2, 8, daysAgo(28)),
    // this year, month by month: stacks of two to four episodes of the
    // long-titled shows, so the first page of 100 is a real month list
    ...bulkKeys(0, 18).flatMap((key, run) =>
      Array.from({ length: 2 + (run % 3) }, (_, index) =>
        watched(
          'alex',
          key,
          1 + (run % 2),
          index + 1,
          daysAgo(30 + run * 9, 18 + index),
        ),
      ).reverse(),
    ),
    // older: last year and the years before, for the History grouping
    ...Array.from({ length: 24 }, (_, index) =>
      watched(
        'alex',
        'pitt',
        1 + Math.floor(index / 15),
        (index % 15) + 1,
        daysAgo(200 + index * 3),
      ),
    ),
    ...Array.from({ length: 10 }, (_, index) =>
      watched('alex', 'severance', 1, index + 1, daysAgo(380 + index * 20)),
    ),
    ...Array.from({ length: 8 }, (_, index) =>
      watched(
        'alex',
        'dark',
        1 + Math.floor(index / 4),
        (index % 4) + 1,
        daysAgo(800 + index * 40),
      ),
    ),
  ],
  juno: () => [
    watched('juno', 'haikyu', 3, 1, daysAgo(0, 9)),
    watched('juno', 'haikyu', 2, 25, daysAgo(0, 8)),
    watched('juno', 'haikyu', 2, 24, daysAgo(0, 7)),
    watched('juno', 'blackDoves', 4, 10, daysAgo(1, 22)),
    watched('juno', 'witchHat', 2, 23, daysAgo(1, 21)),
    watched('juno', 'witchHat', 2, 22, daysAgo(1, 20)),
    watched('juno', 'xmen', 2, 4, daysAgo(5)),
    watched('juno', 'dexter', 2, 15, daysAgo(19)),
  ],
  'marathonwatcher-2026': () =>
    heavyHistoryKeys().map(([key, season, episode, at]) =>
      watched('marathonwatcher-2026', key, season, episode, at),
    ),
  mira: () =>
    heavyHistoryKeys()
      .slice(28, 40)
      .map(([key, season, episode, at]) =>
        watched('mira', key, season, episode, at),
      ),
  // one episode: the short list that stretched a lone poster across the column
  sam: () => [watched('sam', 'marathon', 8, 2, daysAgo(2))],
};

/** A person's dated history, newest first (`pg-diary.ts` adds the heavy diary and pages it) */
export const historyOf = (name: PersonName): WatchedItem[] =>
  HISTORY[name]?.() ?? [];

/** 2026 so far (137 episodes, 5d 1h, Crime and Drama, Netflix) */
const WEEKS = [
  2, 4, 6, 3, 0, 5, 8, 2, 1, 3, 6, 9, 4, 2, 0, 1, 3, 5, 2, 4, 7, 3, 1, 0, 2, 3,
  5, 6, 2, 1, 4, 3, 2, 6, 8, 3, 2, 1, 4, 2, 3, 5, 2, 4, 3,
  // this week (ISO week 46 on the sample date): the cyan bar
  6,
];

/** How much more than alex each person watches, week by week */
const WEEKLY_SCALE: Partial<Record<PersonName, number>> = {
  alex: 1,
  juno: 9,
  'marathonwatcher-2026': 60,
  mira: 2,
};

export const statsWeekly = (name: PersonName): StatsWeeklyItem[] =>
  WEEKLY_SCALE[name]
    ? WEEKS.map((episodes, index) => ({
        episodes: episodes * (WEEKLY_SCALE[name] ?? 1),
        runtimeHours: Math.round((episodes * 52) / 60),
        totalRuntime: episodes * 52,
        week: index + 1,
      }))
    : [];

const metrics = (episodeCount: number, totalRuntime: number) => ({
  avgPerDay: episodeCount / 316,
  episodeCount,
  longestStreak: 6,
  seriesCount: Math.ceil(episodeCount / 8),
  totalRuntime,
});

export const statsSummary = (name: PersonName): StatsSummary => {
  if (name === 'alex') {
    return {
      current: metrics(137, (5 * 24 + 1) * 60),
      previous: metrics(120, 5800),
    };
  }
  if (name === 'juno') {
    return {
      current: metrics(1287, (22 * 24 + 9) * 60),
      previous: metrics(990, 40_000),
    };
  }
  if (name === 'marathonwatcher-2026') {
    return {
      current: metrics(9876, (416 * 24 + 23) * 60),
      previous: metrics(8765, 400_000),
    };
  }
  if (name === 'mira') {
    return {
      current: metrics(274, (9 * 24 + 4) * 60),
      previous: metrics(120, 6000),
    };
  }
  return { current: metrics(0, 0), previous: metrics(0, 0) };
};

export const statsGenres = (name: PersonName): StatsGenreItem[] =>
  name === 'alex'
    ? [
        { count: 41, genre: 'Crime' },
        { count: 33, genre: 'Drama' },
        { count: 12, genre: 'Mystery' },
      ]
    : name === 'juno'
      ? [
          { count: 410, genre: 'Animation' },
          { count: 220, genre: 'Action' },
        ]
      : name === 'marathonwatcher-2026' || name === 'mira'
        ? [
            { count: 4100, genre: 'Sci-Fi & Fantasy' },
            { count: 2200, genre: 'Action & Adventure' },
          ]
        : [];

export const statsProviders = (name: PersonName): StatsProviderItem[] =>
  name === 'marathonwatcher-2026'
    ? [
        {
          count: 6000,
          defaultColor: '#0064ff',
          logo: null,
          name: 'Paramount Plus Apple TV Channel',
        },
      ]
    : name === 'alex' || name === 'juno' || name === 'mira'
      ? [{ count: 60, defaultColor: '#e50914', logo: null, name: 'Netflix' }]
      : [];
