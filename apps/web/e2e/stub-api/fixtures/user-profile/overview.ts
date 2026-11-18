import type {
  GetStartedStatus,
  Ledger,
  LedgerDetail,
  Overview,
  WaitingFor,
} from '@tvseri.es/schemas';
import { bulkKeys, identity, SHOWS } from './shows.ts';
import { day, daysAgo } from './time.ts';

/**
 * alex's tracker and calendar, dated relative to today (`day(2)` is two days
 * on).
 */
const alexCore = (): Overview => ({
  almostDone: {
    closest: null,
    items: [
      {
        ...identity('blackDoves'),
        code: 'S02E06',
        season: 2,
        seasonTotal: 6,
        timeLeftMinutes: 52,
        toGo: 1,
        unwatchedEpisodes: [6],
      },
      {
        ...identity('shogun'),
        code: 'S01E09',
        season: 1,
        seasonTotal: 10,
        timeLeftMinutes: 115,
        toGo: 2,
        unwatchedEpisodes: [9, 10],
      },
    ],
  },
  catchingUp: [
    {
      ...identity('theChosen'),
      episodeRuntimes: [55, 58, 59, 58],
      episodes: ['S05E05', 'S05E06', 'S05E07', 'S05E08'],
      nextUp: 'S05E05',
      runtime: 58,
      runtimeMinutes: 230,
      runway: { date: day(6), daysToGo: 6, season: 6, state: 'upcoming' },
      waiting: 4,
    },
  ],
  comingUp: [
    {
      ...identity('ringsOfPower'),
      date: day(2),
      daysToGo: 2,
      episode: 1,
      kind: 'season-premiere',
      onWatchlist: true,
      provider: { logoImage: SHOWS.ringsOfPower.poster, name: 'Prime Video' },
      release: 'weekly',
      season: 3,
    },
    {
      ...identity('theChosen'),
      date: day(6),
      daysToGo: 6,
      episode: 1,
      kind: 'season-premiere',
      onWatchlist: false,
      provider: { logoImage: SHOWS.theChosen.poster, name: 'Prime Video' },
      release: 'full-season',
      season: 6,
    },
    {
      ...identity('dexter'),
      date: day(6),
      daysToGo: 6,
      episode: 3,
      kind: 'episode',
      onWatchlist: false,
      provider: { logoImage: SHOWS.dexter.poster, name: 'Paramount Plus' },
      release: 'weekly',
      season: 2,
    },
    {
      ...identity('gildedAge'),
      date: day(20),
      daysToGo: 20,
      episode: 5,
      kind: 'season-finale',
      onWatchlist: false,
      provider: { logoImage: SHOWS.gildedAge.poster, name: 'Sky Go' },
      release: null,
      season: 4,
    },
  ],
  outNow: [
    {
      ...identity('gildedAge'),
      airDate: day(-1),
      code: 'S04E02',
      episode: 2,
      kind: 'episode',
      runtimeMinutes: 62,
      season: 4,
    },
    {
      ...identity('midsomer'),
      airDate: day(-1),
      code: 'S26E01',
      episode: 1,
      kind: 'episode',
      runtimeMinutes: 90,
      season: 26,
    },
  ],
  paused: [
    {
      ...identity('ringsOfPower'),
      lastWatchedAt: daysAgo(99),
      lastWatchedCode: 'S02E06',
    },
    {
      ...identity('lastOfUs'),
      lastWatchedAt: daysAgo(118),
      lastWatchedCode: 'S02E05',
    },
    {
      ...identity('whiteLotus'),
      lastWatchedAt: daysAgo(161),
      lastWatchedCode: 'S03E04',
    },
  ],
  upNext: [
    {
      ...identity('dexter'),
      airDate: day(-5),
      code: 'S02E02',
      episode: 2,
      episodeTitle: 'Fallen',
      isLatest: true,
      lastWatchedAt: daysAgo(1),
      lastWatchedCode: 'S02E01',
      nextSeasonTba: false,
      nextToAir: { airDate: day(6), episode: 3, season: 2 },
      runtime: 58,
      season: 2,
      seasonFinale: false,
      seasonTotal: 8,
      seasonWatched: 1,
      timeLeftMinutes: 58,
      toWatch: 1,
    },
    {
      ...identity('gildedAge'),
      airDate: day(-1),
      code: 'S04E02',
      episode: 2,
      episodeTitle: 'Episode 2',
      isLatest: true,
      lastWatchedAt: daysAgo(7),
      lastWatchedCode: 'S04E01',
      nextSeasonTba: false,
      nextToAir: { airDate: day(6), episode: 3, season: 4 },
      runtime: 62,
      season: 4,
      seasonFinale: false,
      seasonTotal: 8,
      seasonWatched: 1,
      timeLeftMinutes: 62,
      toWatch: 1,
    },
    {
      ...identity('blackDoves'),
      airDate: day(-30),
      code: 'S02E06',
      episode: 6,
      episodeTitle: 'Episode 6',
      isLatest: false,
      lastWatchedAt: daysAgo(5),
      lastWatchedCode: 'S02E05',
      nextSeasonTba: true,
      nextToAir: null,
      runtime: 52,
      season: 2,
      seasonFinale: true,
      seasonTotal: 6,
      seasonWatched: 5,
      timeLeftMinutes: 52,
      toWatch: 1,
    },
    {
      ...identity('theChosen'),
      airDate: day(-40),
      code: 'S05E05',
      episode: 5,
      episodeTitle: 'The Last Supper, Part 1',
      isLatest: false,
      lastWatchedAt: daysAgo(12),
      lastWatchedCode: 'S05E04',
      nextSeasonTba: false,
      nextToAir: { airDate: day(6), episode: 1, season: 6 },
      runtime: 58,
      season: 5,
      seasonFinale: false,
      seasonTotal: 8,
      seasonWatched: 4,
      timeLeftMinutes: 232,
      toWatch: 4,
    },
  ],
});

/**
 * alex's overview with a long tail of shows in progress (the In progress page
 * shows ten): long titles, odd episode counts, so the tiles wrap like real ones.
 */
export const alexOverview = (): Overview => {
  const core = alexCore();
  const more: Overview['upNext'] = bulkKeys(0, 6).map((key, index) => ({
    ...identity(key),
    airDate: day(-20 - index),
    code: `S0${1 + (index % 3)}E0${2 + index}`,
    episode: 2 + index,
    episodeTitle: 'Episode with a long title that has to be clamped',
    isLatest: false,
    lastWatchedAt: daysAgo(14 + index * 6),
    lastWatchedCode: `S0${1 + (index % 3)}E0${1 + index}`,
    nextSeasonTba: false,
    nextToAir: null,
    runtime: 45,
    season: 1 + (index % 3),
    seasonFinale: false,
    seasonTotal: 10,
    seasonWatched: 1 + index,
    timeLeftMinutes: 45 * (9 - index),
    toWatch: 9 - index,
  }));
  return { ...core, upNext: [...core.upNext, ...more] };
};

export const alexWaitingFor = (): WaitingFor => ({
  endedCount: 4,
  items: [
    {
      ...identity('pitt'),
      daysToGo: 59,
      finishedAt: daysAgo(207),
      nextDate: day(59),
      nextEpisode: 1,
      nextSeason: 3,
      resumingSoon: false,
      state: 'dated',
    },
    {
      ...identity('severance'),
      daysToGo: 67,
      finishedAt: daysAgo(19),
      nextDate: day(67),
      nextEpisode: 1,
      nextSeason: 3,
      resumingSoon: false,
      state: 'dated',
    },
    {
      ...identity('wednesday'),
      finishedAt: daysAgo(10),
      nextSeason: 3,
      resumingSoon: false,
      state: 'renewed',
    },
  ],
});

/** A long history with 23 missing episodes (one in each of seasons 1 to 23), as real data has */
const MANY_HOLES = Array.from({ length: 23 }, (_, index) => index + 1);

export const alexLedger = ({
  manyHoles = false,
}: Readonly<{ manyHoles?: boolean }> = {}): Ledger => ({
  shows: [
    manyHoles
      ? {
          ...identity('midsomer'),
          episodes: MANY_HOLES.map(
            (season) => `S${String(season).padStart(2, '0')}E03`,
          ),
          missingCount: MANY_HOLES.length,
          seasonCount: 26,
          seasons: MANY_HOLES.map((season) => ({ missing: 1, season })),
        }
      : {
          ...identity('midsomer'),
          episodes: ['S08E05', 'S14E03', 'S23E04'],
          missingCount: 3,
          seasonCount: 26,
          seasons: [
            { missing: 1, season: 8 },
            { missing: 1, season: 14 },
            { missing: 1, season: 23 },
          ],
        },
    {
      ...identity('theChosen'),
      episodes: ['S02E03'],
      missingCount: 1,
      seasonCount: 5,
      seasons: [{ missing: 1, season: 2 }],
    },
  ],
});

export const alexLedgerDetail = (
  seriesId: number,
  { manyHoles = false }: Readonly<{ manyHoles?: boolean }> = {},
): LedgerDetail | null => {
  if (seriesId === SHOWS.midsomer.id && manyHoles) {
    return {
      episodes: MANY_HOLES.map((season) => ({
        airDate: `${2000 + season}-02-13`,
        code: `S${String(season).padStart(2, '0')}E03`,
        episode: 3,
        season,
        title: `Hole ${season}`,
      })),
      seriesId,
    };
  }
  if (seriesId === SHOWS.midsomer.id) {
    return {
      episodes: [
        {
          airDate: '2005-02-13',
          code: 'S08E05',
          episode: 5,
          season: 8,
          title: 'Bantling Boy',
        },
        {
          airDate: '2011-03-02',
          code: 'S14E03',
          episode: 3,
          season: 14,
          title: 'The Sleeper Under the Hill',
        },
        {
          airDate: '2024-02-18',
          code: 'S23E04',
          episode: 4,
          season: 23,
          title: 'Claws Out',
        },
      ],
      seriesId,
    };
  }
  if (seriesId === SHOWS.theChosen.id) {
    return {
      episodes: [
        {
          airDate: '2021-06-06',
          code: 'S02E03',
          episode: 3,
          season: 2,
          title: 'Matthew 4:24',
        },
      ],
      seriesId,
    };
  }
  return null;
};

/** alex is past the 30 days: hidden */
export const doneGetStarted = (): GetStartedStatus => ({
  doneAt: daysAgo(300),
  doneCount: 3,
  hidden: true,
  steps: { alreadySeen: true, history: true, services: true },
});

/** nina, day one: nothing done yet */
export const newGetStarted = (): GetStartedStatus => ({
  doneAt: null,
  doneCount: 0,
  hidden: false,
  steps: { alreadySeen: false, history: false, services: false },
});

/** Every block empty */
export const emptyOverview = (): Overview => ({
  almostDone: { closest: null, items: [] },
  catchingUp: [],
  comingUp: [],
  outNow: [],
  paused: [],
  upNext: [],
});

const run = (season: number, from: number, to: number) =>
  Array.from(
    { length: to - from + 1 },
    (_, index) =>
      `S${String(season).padStart(2, '0')}E${String(from + index).padStart(2, '0')}`,
  );

/**
 * sam's tracker with real-data shapes: a long title, a run of 26 waiting
 * episodes that crosses a season, and one watched episode in the history
 * (`library.ts`), so layout bugs that tidy fixtures hide show up.
 */
export const samOverview = (): Overview => ({
  ...emptyOverview(),
  catchingUp: [
    {
      ...identity('marathon'),
      episodeRuntimes: Array.from({ length: 26 }, () => 44),
      episodes: [...run(8, 3, 14), ...run(9, 1, 14)],
      nextUp: 'S08E03',
      runtime: 44,
      runtimeMinutes: 26 * 44,
      runway: { date: day(12), daysToGo: 12, season: 10, state: 'upcoming' },
      waiting: 26,
    },
    {
      ...identity('theChosen'),
      episodeRuntimes: [55, 58, 59, 58],
      episodes: ['S05E05', 'S05E06', 'S05E07', 'S05E08'],
      nextUp: 'S05E05',
      runtime: 58,
      runtimeMinutes: 230,
      runway: null,
      waiting: 4,
    },
  ],
});
