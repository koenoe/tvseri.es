import type {
  CatchingUpItem,
  Circle,
  ComingUpItem,
  Ledger,
  LedgerDetail,
  Overview,
  PausedItem,
  TasteMatchResponse,
  UpNextItem,
  WaitingFor,
  WaitingForItem,
} from '@tvseri.es/schemas';

import { PEOPLE } from './people.ts';
import {
  HEAVY_COUNT,
  type HeavyKey,
  heavyKeys,
  identity,
  type ShowKey,
  sharedLine,
  showOf,
} from './shows.ts';
import { day, daysAgo } from './time.ts';

/**
 * The heavy profile (`marathonwatcher-2026`) and a medium one (`mira`):
 * real-data shapes for the overflow and caps rules. Every lane is far past its
 * cap: 22 shows catching up with 8 to 32 episodes waiting across seasons (the
 * API sends at most 8 codes), 28 paused, 9 almost done, 5 out now (dates this
 * year and last), 14 tickets, 15 returns, a show with 23 holes, long and
 * non-Latin titles, 80-character episode titles, four-digit counts and "999h
 * 59m".
 */

/** The heavy show at `index`, wrapping round the list */
const h = (index: number): HeavyKey =>
  heavyKeys(index % HEAVY_COUNT, (index % HEAVY_COUNT) + 1)[0] as HeavyKey;

const code = (season: number, episode: number) =>
  `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

/** An episode title of 80 characters */
const LONG_EPISODE =
  'The One Where Everybody Finally Remembers What Happened at the Lake House in 1987';

// Up next: the hero and the In progress tiles

const upNextItem = (key: ShowKey, index: number): UpNextItem => ({
  ...identity(key),
  airDate: day(-3 - index * 5),
  code: code(2 + (index % 3), 4 + index),
  episode: 4 + index,
  episodeTitle: index === 0 ? LONG_EPISODE : `Episode ${4 + index}`,
  isLatest: index % 4 === 0,
  lastWatchedAt: daysAgo(index * 2),
  lastWatchedCode: code(2 + (index % 3), 3 + index),
  nextSeasonTba: index % 4 === 1,
  nextToAir:
    index % 4 === 0 ? { airDate: day(4), episode: 5 + index, season: 2 } : null,
  runtime: 58,
  season: 2 + (index % 3),
  seasonFinale: index % 5 === 2,
  seasonTotal: index === 0 ? 1048 : 24,
  seasonWatched: index === 0 ? 3 : 3 + index,
  timeLeftMinutes: index === 0 ? 59_999 : 58 * (20 - index),
  toWatch: index === 0 ? 1045 : 20 - index,
});

// Catching up: 22 shows, 8 to 32 waiting, some across seasons

/** The first waiting episodes (at most 8, as the API sends them) */
const waitingCodes = (
  season: number,
  from: number,
  inSeason: number,
  waiting: number,
): string[] => {
  const codes: string[] = [];
  for (let n = 0; n < Math.min(8, waiting); n += 1) {
    const offset = from + n;
    codes.push(
      offset <= from + inSeason - 1
        ? code(season, offset)
        : code(season + 1, offset - (from + inSeason) + 1),
    );
  }
  return codes;
};

const RUNWAYS: ReadonlyArray<CatchingUpItem['runway']> = [
  { date: day(6), daysToGo: 6, season: 4, state: 'upcoming' },
  null,
  { date: day(1), daysToGo: 1, season: 12, state: 'upcoming' },
  { date: day(-9), daysToGo: 0, season: 3, state: 'out' },
  null,
  { date: day(23), daysToGo: 23, season: 10, state: 'upcoming' },
];

const catchingUpItem = (index: number): CatchingUpItem => {
  const key = h(index + 3);
  const waiting = 8 + ((index * 7) % 25);
  const season = 1 + (index % 9);
  // every third show crosses into the next season after three episodes
  const inSeason = index % 3 === 0 ? 3 : waiting;
  const from = 1 + (index % 6);
  const episodes = waitingCodes(season, from, inSeason, waiting);
  const perEpisode = index === 1 ? 1875 : 44 + (index % 4) * 6;
  return {
    ...identity(key),
    episodeRuntimes: episodes.map(() => perEpisode),
    episodes,
    nextUp: episodes[0] ?? code(season, from),
    runtime: index === 1 ? 1875 : 44 + (index % 4) * 6,
    runtimeMinutes: index === 1 ? 59_999 : waiting * (44 + (index % 4) * 6),
    runway: RUNWAYS[index % RUNWAYS.length] ?? null,
    waiting,
  };
};

// Coming up: 14 tickets in the next 30 days

const KINDS: ReadonlyArray<ComingUpItem['kind']> = [
  'season-premiere',
  'episode',
  'season-finale',
];

const comingUpItem = (index: number): ComingUpItem => {
  const kind = KINDS[index % KINDS.length] ?? 'episode';
  return {
    ...identity(h(index + 8)),
    date: day(index * 2),
    daysToGo: index * 2,
    episode: kind === 'season-premiere' ? 1 : 10 + index,
    kind,
    onWatchlist: index % 2 === 0,
    provider: {
      logoImage: showOf(h(index)).poster,
      name: index % 3 ? 'Paramount Plus Apple TV Channel' : 'Netflix',
    },
    release:
      kind === 'season-premiere'
        ? index % 2
          ? 'weekly'
          : 'full-season'
        : null,
    season: 10 + index,
  };
};

// Paused: 28

const pausedItem = (index: number): PausedItem => ({
  ...identity(h(index + 1)),
  // this year and the years before ("Last watched Aug 2", "… Feb 2024")
  lastWatchedAt: daysAgo(95 + index * 37),
  lastWatchedCode: code(10 + index, 100 + index),
});

export const heavyOverview = (): Overview => ({
  almostDone: {
    closest: null,
    items: Array.from({ length: 9 }, (_, index) => {
      const toGo = 1 + (index % 2);
      const next = 9 + index;
      return {
        ...identity(h(index)),
        code: code(1 + index, next),
        season: 1 + index,
        seasonTotal: next + toGo - 1,
        timeLeftMinutes:
          [52, 89, 115, 3599, 61, 59_999, 120, 47, 95][index] ?? 60,
        toGo,
        unwatchedEpisodes: Array.from({ length: toGo }, (_, i) => next + i),
      };
    }),
  },
  catchingUp: Array.from({ length: 22 }, (_, index) => catchingUpItem(index)),
  comingUp: Array.from({ length: 14 }, (_, index) => comingUpItem(index)),
  outNow: [
    {
      ...identity(h(3)),
      airDate: day(-1),
      code: 'S01E03',
      episode: 3,
      kind: 'episode',
      runtimeMinutes: 61,
      season: 1,
    },
    {
      ...identity(h(0)),
      airDate: '2025-08-15',
      code: 'S01E03',
      episode: 3,
      kind: 'episode',
      runtimeMinutes: 40,
      season: 1,
    },
    {
      ...identity(h(9)),
      airDate: '2025-12-31',
      code: 'S12E108',
      episode: 108,
      kind: 'episode',
      runtimeMinutes: 89,
      season: 12,
    },
    {
      ...identity(h(10)),
      airDate: day(-3),
      episodes: 24,
      kind: 'season-complete',
      runtimeMinutes: 1056,
      season: 2,
    },
    {
      ...identity(h(12)),
      airDate: day(-6),
      code: 'S03E11',
      episode: 11,
      kind: 'episode',
      runtimeMinutes: 59_999,
      season: 3,
    },
  ],
  paused: Array.from({ length: 28 }, (_, index) => pausedItem(index)),
  upNext: Array.from({ length: 30 }, (_, index) =>
    upNextItem(h(index + 4), index),
  ),
});

export const heavyWaitingFor = (): WaitingFor => ({
  endedCount: 12,
  items: Array.from({ length: 15 }, (_, index): WaitingForItem => {
    const dated = index % 3 !== 2;
    const daysToGo = 31 + index * 23;
    return {
      ...identity(h(index + 14)),
      daysToGo: dated ? daysToGo : undefined,
      finishedAt: daysAgo(40 + index * 61),
      nextDate: dated ? day(daysToGo) : undefined,
      nextEpisode: dated ? 1 : undefined,
      nextSeason: 2 + index * 3,
      resumingSoon: false,
      state: dated ? 'dated' : 'renewed',
    };
  }),
});

/** One hole in each of seasons 1 to 23 of a 26-season show */
const HOLES = Array.from({ length: 23 }, (_, index) => index + 1);

/** The ledger's shows: 23 holes first, then "Next: How to Sell Drugs Online (Fast)" */
const LEDGER_KEYS = [h(13), h(4), h(10), h(12)] as const;

export const heavyLedger = (): Ledger => ({
  shows: LEDGER_KEYS.map((key, index) => {
    const holes = index === 0 ? HOLES : [1, 2];
    return {
      ...identity(key),
      episodes: holes.map((season) => code(season, 3)),
      missingCount: holes.length,
      seasonCount: index === 0 ? 26 : 4,
      seasons: holes.map((season) => ({ missing: 1, season })),
    };
  }),
});

export const heavyLedgerDetail = (seriesId: number): LedgerDetail | null => {
  const index = LEDGER_KEYS.findIndex((key) => showOf(key).id === seriesId);
  if (index === -1) {
    return null;
  }
  const holes = index === 0 ? HOLES : [1, 2];
  return {
    episodes: holes.map((season) => ({
      airDate: season % 2 ? `${2000 + season}-02-13` : '',
      code: code(season, 3),
      episode: 3,
      season,
      title: LONG_EPISODE,
    })),
    seriesId,
  };
};

// The medium profile (mira): a few rows in every lane

export const miraOverview = (): Overview => {
  const heavyData = heavyOverview();
  return {
    almostDone: {
      closest: null,
      items: heavyData.almostDone.items.slice(0, 3),
    },
    catchingUp: heavyData.catchingUp.slice(0, 4),
    comingUp: heavyData.comingUp.slice(0, 5),
    outNow: heavyData.outNow.slice(0, 3),
    paused: heavyData.paused.slice(0, 5),
    upNext: heavyData.upNext.slice(2, 8),
  };
};

export const miraWaitingFor = (): WaitingFor => ({
  endedCount: 2,
  items: heavyWaitingFor().items.slice(0, 4),
});

export const miraLedger = (): Ledger => ({
  shows: [
    {
      ...identity(h(4)),
      episodes: ['S01E03', 'S02E03', 'S03E05', 'S03E06', 'S04E01'],
      missingCount: 5,
      seasonCount: 4,
      seasons: [
        { missing: 1, season: 1 },
        { missing: 1, season: 2 },
        { missing: 2, season: 3 },
        { missing: 1, season: 4 },
      ],
    },
  ],
});

export const miraLedgerDetail = (seriesId: number): LedgerDetail | null =>
  seriesId === showOf(h(4)).id
    ? {
        episodes:
          miraLedger().shows[0]?.episodes.map((episodeCode) => {
            const season = Number(episodeCode.slice(1, 3));
            const episode = Number(episodeCode.slice(4));
            return {
              airDate: `${2018 + season}-05-0${episode}`,
              code: episodeCode,
              episode,
              season,
              title: `Episode ${episode}`,
            };
          }) ?? [],
        seriesId,
      }
    : null;

// Lists, history and the visitor's match

/** The heavy library: lists far past a first page */
export const HEAVY_LIBRARY = {
  favorites: heavyKeys(0, HEAVY_COUNT),
  in_progress: heavyKeys(0, 30),
  watched: heavyKeys(0, HEAVY_COUNT),
  watchlist: heavyKeys(10, HEAVY_COUNT),
} as const;

export const MIRA_LIBRARY = {
  favorites: heavyKeys(0, 8),
  in_progress: heavyKeys(2, 10),
  watched: heavyKeys(10, 20),
  watchlist: heavyKeys(20, 26),
} as const;

/** The heavy viewer's history: a stack of 30 of one show, long titles */
export const heavyHistoryKeys = (): ReadonlyArray<
  readonly [ShowKey, number, number, number]
> => [
  ...Array.from(
    { length: 30 },
    (_, index) => [h(8), 3, 30 - index, daysAgo(0, 22 - (index % 20))] as const,
  ),
  [h(10), 1, 12, daysAgo(1)],
  [h(11), 2, 16, daysAgo(2)],
  [h(12), 1, 20, daysAgo(4)],
  [h(9), 7, 108, daysAgo(400)],
  ...heavyKeys(14, 34).map(
    (key, index) => [key, 1, index + 1, daysAgo(10 + index * 3)] as const,
  ),
];

const taste = (
  key: ShowKey,
  reason?: 'favourite' | 'finished' | 'watching',
) => {
  const s = showOf(key);
  return {
    id: s.id,
    posterImage: s.poster,
    ...(reason ? { reason } : {}),
    slug: s.slug,
    title: s.title,
  };
};

/** alex visiting the heavy profile: long shared titles, every kind of next */
export const heavyMatch = (following: boolean): TasteMatchResponse => ({
  following,
  followsYou: true,
  match: {
    arc: 78,
    level: 'very-high',
    notEnough: false,
    sharedCount: 1287,
    sharedShows: [
      {
        ...taste(h(0)),
        ...sharedLine(h(0)),
        finishedSeason: null,
        next: { date: day(59), kind: 'season-premiere', season: 13 },
        relation: 'both-favourite',
      },
      {
        ...taste(h(8)),
        ...sharedLine(h(8)),
        finishedSeason: 12,
        next: { date: day(400), kind: 'season-premiere', season: 13 },
        relation: 'both-finished',
      },
      {
        ...taste(h(3)),
        ...sharedLine(h(3)),
        finishedSeason: null,
        next: { date: day(6), episode: 103, kind: 'episode', season: 12 },
        relation: 'both-watching',
      },
      {
        ...taste(h(9)),
        ...sharedLine(h(9)),
        finishedSeason: null,
        next: { kind: 'season-out', season: 12 },
        relation: 'both-watching',
      },
      {
        ...taste(h(11)),
        ...sharedLine(h(11)),
        finishedSeason: 3,
        next: null,
        relation: 'both-finished',
      },
      {
        ...taste(h(12)),
        ...sharedLine(h(12)),
        finishedSeason: null,
        next: null,
        relation: 'both-watching',
      },
    ],
  },
  newToYou: [
    taste(h(13), 'favourite'),
    taste(h(10), 'finished'),
    taste(h(9), 'watching'),
  ],
  split: {
    theirs: {
      genre: 'Sci-Fi & Fantasy',
      genreId: 10765,
      ownerCount: 1204,
      viewerCount: 0,
    },
    yours: {
      genre: 'Action & Adventure',
      genreId: 10759,
      ownerCount: 2,
      viewerCount: 987,
    },
  },
});

/** The heavy viewer's circle: long titles, two people on a pick */
export const heavyCircle = (): Circle => {
  const person = (
    name: 'juno' | 'wren' | 'ivo',
    level: 'super' | 'very-high' | 'medium',
    arc: number,
  ) => ({
    arc,
    id: PEOPLE[name].user.id,
    level,
    username: PEOPLE[name].user.username,
  });
  return {
    followingCount: 987,
    picks: [
      {
        doorGenre: null,
        kind: 'favourite',
        people: [person('juno', 'super', 92)],
        show: taste(h(13)),
      },
      {
        doorGenre: null,
        kind: 'finished',
        people: [person('juno', 'super', 92), person('wren', 'very-high', 78)],
        show: taste(h(8)),
      },
      {
        doorGenre: 'Animation',
        kind: 'favourite',
        people: [person('ivo', 'medium', 48)],
        show: taste(h(10)),
      },
    ],
  };
};
