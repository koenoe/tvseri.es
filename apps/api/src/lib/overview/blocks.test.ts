import type {
  SeriesFacts,
  WaitingFor,
  WaitingForItem,
} from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { analyzeShow, type ShowInput } from './analyze';
import {
  buildAlmostDone,
  buildCatchingUp,
  buildComingUp,
  buildOutNow,
  buildPaused,
  buildUpNext,
  waitingForLater,
} from './blocks';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const day = (offset: number) =>
  new Date(NOW + offset * 86_400_000).toISOString().slice(0, 10);

const ep = (season: number, episode: number, airDate: string) => ({
  airDate,
  episodeNumber: episode,
  runtime: 50,
  seasonNumber: season,
});

const facts = (overrides: Partial<SeriesFacts> = {}): SeriesFacts => ({
  backdropPath: null,
  episodeRuntime: 50,
  firstAirDate: '2020-01-01',
  genreIds: [],
  id: 1,
  imdbId: null,
  lastAirDate: day(-1),
  lastEpisodeToAir: ep(2, 8, day(-1)),
  networks: [],
  nextEpisodeToAir: null,
  numberOfEpisodes: 16,
  originalLanguage: 'en',
  originCountries: [],
  popularity: 1,
  posterPath: '/p.jpg',
  seasons: [
    { airDate: '2020-01-01', episodeCount: 8, seasonNumber: 1 },
    { airDate: '2021-01-01', episodeCount: 8, seasonNumber: 2 },
  ],
  slug: 'show',
  status: 'Returning Series',
  title: 'Show',
  totalRuntime: 800,
  type: null,
  voteAverage: 0,
  voteCount: 0,
  ...overrides,
});

const watched = (
  list: ReadonlyArray<readonly [number, number]>,
  watchedAt = NOW - 86_400_000,
) =>
  list.map(([seasonNumber, episodeNumber]) => ({
    episodeNumber,
    seasonNumber,
    watchedAt,
  }));

const range = (season: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => [season, from + i] as const);

const state = (overrides: Partial<ShowInput> & { facts?: SeriesFacts } = {}) =>
  analyzeShow(
    {
      facts: facts(),
      prefs: { paused: null, pausedAt: null, skipped: [] },
      watched: watched([...range(1, 1, 8), ...range(2, 1, 5)]),
      ...overrides,
    },
    NOW,
  );

describe('Up next', () => {
  it('is the first unwatched episode after the last watched one', () => {
    const [item] = buildUpNext([state()]);

    expect(item).toMatchObject({
      code: 'S02E06',
      isLatest: false,
      lastWatchedCode: 'S02E05',
      seasonDone: 5,
      seasonTotal: 8,
      seasonWatched: 5,
      timeLeftMinutes: 150,
      toWatch: 3,
    });
  });

  it('counts a skipped episode of the season as done, not watched', () => {
    const [item] = buildUpNext([
      state({ prefs: { paused: null, pausedAt: null, skipped: ['S02E06'] } }),
    ]);
    expect(item).toMatchObject({
      code: 'S02E07',
      seasonDone: 6,
      seasonWatched: 5,
      toWatch: 2,
    });
  });

  it('skips skipped episodes and falls back to a hole when nothing is after', () => {
    const skipping = state({
      prefs: { paused: null, pausedAt: null, skipped: ['S02E06'] },
      watched: watched([...range(1, 1, 8), ...range(2, 1, 5), [2, 7], [2, 8]]),
    });
    expect(buildUpNext([skipping])).toEqual([]);

    const hole = state({
      watched: watched([
        ...range(1, 1, 3),
        ...range(1, 5, 8),
        ...range(2, 1, 8),
      ]),
    });
    expect(buildUpNext([hole])[0]?.code).toBe('S01E04');
  });

  it('is the first aired episode with no mark, even before the last watched one', () => {
    // S1 complete, S2 E1–E5 watched, then S2 E2 unmarked: Next up is S2 E2.
    const unmarked = state({
      watched: watched([...range(1, 1, 8), [2, 1], ...range(2, 3, 5)]),
    });
    expect(buildUpNext([unmarked])[0]?.code).toBe('S02E02');
  });

  it('flags the latest episode, the season finale and a TBA next season', () => {
    const finale = state({
      watched: watched([...range(1, 1, 8), ...range(2, 1, 7)]),
    });
    const [item] = buildUpNext([finale]);

    expect(item).toMatchObject({
      code: 'S02E08',
      isLatest: true,
      nextSeasonTba: true,
      seasonFinale: true,
    });
  });

  it('shows when the next episode airs', () => {
    const airing = state({
      facts: facts({ nextEpisodeToAir: ep(2, 9, day(3)) }),
    });

    expect(buildUpNext([airing])[0]?.nextToAir).toEqual({
      airDate: day(3),
      episode: 9,
      season: 2,
    });
  });

  it('lists the most recently watched first, and leaves hidden shows out', () => {
    const older = state({
      facts: facts({ id: 2 }),
      watched: watched(range(1, 1, 2), NOW - 5 * 86_400_000),
    });
    const hidden = state({
      facts: facts({ id: 3 }),
      prefs: { paused: 'hide', pausedAt: 1, skipped: [] },
    });

    expect(
      buildUpNext([older, state(), hidden]).map((item) => item.seriesId),
    ).toEqual([1, 2]);
  });
});

describe('Almost done', () => {
  it('lists seasons that are fully aired with one or two episodes to go', () => {
    const one = state({
      watched: watched([...range(1, 1, 8), ...range(2, 1, 7)]),
    });
    const two = state({
      facts: facts({ id: 2 }),
      watched: watched([...range(1, 1, 8), ...range(2, 1, 6)]),
    });
    const far = state({ facts: facts({ id: 3 }) });

    const { closest, items } = buildAlmostDone([far, two, one]);

    expect(items.map((item) => [item.seriesId, item.toGo])).toEqual([
      [1, 1],
      [2, 2],
    ]);
    expect(items[0]).toMatchObject({ code: 'S02E08', timeLeftMinutes: 50 });
    expect(closest).toBeNull();
  });

  it('names the closest show when none is within two', () => {
    const far = state({
      watched: watched(range(1, 1, 8).concat(range(2, 1, 4))),
    });

    expect(buildAlmostDone([far])).toEqual({
      closest: { seriesId: 1, title: 'Show', toGo: 4 },
      items: [],
    });
  });

  it('names the episodes left, wherever they sit in the season', () => {
    // E01 skipped, E02–E08 watched: 7 of 8, the one to go is the first
    const gap = state({
      watched: watched([...range(1, 1, 8), ...range(2, 2, 8)]),
    });

    expect(buildAlmostDone([gap]).items[0]).toMatchObject({
      code: 'S02E01',
      seasonTotal: 8,
      toGo: 1,
      unwatchedEpisodes: [1],
    });
  });

  it('does not count a season that is still airing', () => {
    const airing = state({
      facts: facts({
        lastEpisodeToAir: ep(2, 6, day(-1)),
        nextEpisodeToAir: ep(2, 7, day(6)),
      }),
      watched: watched([...range(1, 1, 8), ...range(2, 1, 5)]),
    });

    expect(buildAlmostDone([airing]).items).toEqual([]);
  });
});

describe('Out now, Season complete, Catching up', () => {
  it('has a row for the latest episode while one or two are waiting', () => {
    const rows = buildOutNow(
      [state({ watched: watched([...range(1, 1, 8), ...range(2, 1, 7)]) })],
      NOW,
    );

    expect(rows).toEqual([
      expect.objectContaining({
        airDate: day(-1),
        code: 'S02E08',
        kind: 'episode',
        runtimeMinutes: 50,
      }),
    ]);
  });

  it('has nothing when the latest episode is watched', () => {
    expect(
      buildOutNow(
        [state({ watched: watched([...range(1, 1, 8), ...range(2, 1, 8)]) })],
        NOW,
      ),
    ).toEqual([]);
  });

  it('turns into a Season complete row when a season finished airing 14 days ago or less with 3+ unwatched', () => {
    const fresh = state({ watched: watched(range(1, 1, 8)) });

    expect(buildOutNow([fresh], NOW)).toEqual([
      expect.objectContaining({
        episodes: 8,
        kind: 'season-complete',
        runtimeMinutes: 400,
        season: 2,
      }),
    ]);
    expect(buildCatchingUp([fresh], NOW)).toEqual([]);
  });

  it('becomes Catching up after 14 days', () => {
    const stale = state({
      facts: facts({ lastEpisodeToAir: ep(2, 8, day(-15)) }),
      watched: watched(range(1, 1, 8)),
    });

    expect(buildOutNow([stale], NOW)).toEqual([]);
    expect(buildCatchingUp([stale], NOW)[0]).toMatchObject({
      episodes: [
        'S02E01',
        'S02E02',
        'S02E03',
        'S02E04',
        'S02E05',
        'S02E06',
        'S02E07',
        'S02E08',
      ],
      nextUp: 'S02E01',
      runtimeMinutes: 400,
      waiting: 8,
    });
  });

  it('needs 3 waiting episodes to catch up', () => {
    const two = state({
      watched: watched([...range(1, 1, 8), ...range(2, 1, 6)]),
    });

    expect(buildCatchingUp([two], NOW)).toEqual([]);
  });

  it('adds the premiere runway when the next season has a date within 30 days', () => {
    const lagging = state({
      facts: facts({
        lastEpisodeToAir: ep(2, 8, day(-30)),
        nextEpisodeToAir: ep(3, 1, day(6)),
      }),
      watched: watched([...range(1, 1, 8), ...range(2, 1, 4)]),
    });

    expect(buildCatchingUp([lagging], NOW)[0]?.runway).toEqual({
      date: day(6),
      daysToGo: 6,
      season: 3,
      state: 'upcoming',
    });
  });

  it('says the season is out when it premiered while episodes still wait', () => {
    const missed = state({
      facts: facts({
        lastEpisodeToAir: ep(3, 1, day(-3)),
        seasons: [
          { airDate: '2020-01-01', episodeCount: 8, seasonNumber: 1 },
          { airDate: '2021-01-01', episodeCount: 8, seasonNumber: 2 },
          { airDate: day(-3), episodeCount: 8, seasonNumber: 3 },
        ],
      }),
      watched: watched([...range(1, 1, 8), ...range(2, 1, 4)]),
    });

    expect(buildCatchingUp([missed], NOW)[0]?.runway).toEqual({
      date: day(-3),
      daysToGo: 0,
      season: 3,
      state: 'out',
    });
  });

  it('has no runway without a date', () => {
    const none = state({
      facts: facts({ lastEpisodeToAir: ep(2, 8, day(-20)) }),
      watched: watched(range(1, 1, 8).concat(range(2, 1, 2))),
    });

    expect(buildCatchingUp([none], NOW)[0]?.runway).toBeNull();
  });
});

describe('Coming up', () => {
  const source = (overrides: Partial<SeriesFacts>, onWatchlist = false) => ({
    onWatchlist,
    state: state({ facts: facts(overrides) }),
  });

  it('makes tickets for the next 30 days: premiere, episode, finale', () => {
    const tickets = buildComingUp(
      [
        source({ id: 1, nextEpisodeToAir: ep(3, 1, day(6)) }, true),
        source({ id: 2, nextEpisodeToAir: ep(2, 3, day(2)) }),
        source({ id: 3, nextEpisodeToAir: ep(2, 8, day(20)) }),
        source({ id: 4, nextEpisodeToAir: ep(3, 1, day(31)) }),
        source({ id: 5, nextEpisodeToAir: null }),
      ],
      NOW,
    );

    expect(
      tickets.map((ticket) => [
        ticket.seriesId,
        ticket.kind,
        ticket.daysToGo,
        ticket.onWatchlist,
      ]),
    ).toEqual([
      [2, 'episode', 2, false],
      [1, 'season-premiere', 6, true],
      [3, 'season-finale', 20, false],
    ]);
  });

  it('lists a show once', () => {
    const twice = [
      source({ id: 1, nextEpisodeToAir: ep(2, 3, day(2)) }),
      source({ id: 1, nextEpisodeToAir: ep(2, 3, day(2)) }, true),
    ];

    expect(buildComingUp(twice, NOW)).toHaveLength(1);
  });
});

describe('Paused', () => {
  const stale = (overrides: Partial<ShowInput> = {}) =>
    state({
      watched: watched(range(1, 1, 3), NOW - 100 * 86_400_000),
      ...overrides,
    });

  it('lists shows not watched for over 3 months, most recent first', () => {
    const newer = stale({
      facts: facts({ id: 2 }),
      watched: watched(range(1, 1, 3), NOW - 95 * 86_400_000),
    });

    expect(buildPaused([stale(), newer, state()], NOW)).toEqual([
      expect.objectContaining({ lastWatchedCode: 'S01E03', seriesId: 2 }),
      expect.objectContaining({ seriesId: 1 }),
    ]);
  });

  it('leaves out Hide, and Keep until watched again and stale again', () => {
    const hidden = stale({
      prefs: { paused: 'hide', pausedAt: 1, skipped: [] },
    });
    const kept = stale({
      prefs: { paused: 'keep', pausedAt: NOW - 10 * 86_400_000, skipped: [] },
    });
    const keptThenWatched = stale({
      prefs: { paused: 'keep', pausedAt: NOW - 200 * 86_400_000, skipped: [] },
    });

    expect(buildPaused([hidden], NOW)).toEqual([]);
    expect(buildPaused([kept], NOW)).toEqual([]);
    expect(buildPaused([keptThenWatched], NOW)).toHaveLength(1);
  });

  it('ignores undated watches for the last date', () => {
    const undated = stale({
      watched: [
        ...watched(range(1, 1, 3), NOW - 100 * 86_400_000),
        {
          dateUnknown: true,
          episodeNumber: 9,
          seasonNumber: 1,
          watchedAt: NOW,
        },
      ],
    });

    expect(buildPaused([undated], NOW)).toHaveLength(1);
  });
});

describe('Time left (the show page’s rule: each episode’s own runtime)', () => {
  // Season 2's lengths vary; the show-level runtime (55) fits none of them
  const RUNTIMES = {
    1: [50, 50, 50, 50, 50, 50, 50, 50],
    2: [40, 34, 38, 36, 35, 33, 37, 52],
  };
  const varied = (overrides: Partial<ShowInput> = {}) =>
    state({
      facts: facts({ episodeRuntime: 55 }),
      runtimes: RUNTIMES,
      ...overrides,
    });

  it('sums the remaining episodes of the season, never runtime × count', () => {
    const [item] = buildUpNext([varied()]);

    // E6–E8: 33 + 37 + 52, where 3 × 55 would say 165
    expect(item).toMatchObject({
      runtime: 33,
      timeLeftMinutes: 122,
      toWatch: 3,
    });
    expect(item?.seasonRuntimes).toEqual([40, 34, 38, 36, 35, 33, 37, 52]);
  });

  it('agrees in Almost done, Out now, Season complete and Catching up', () => {
    const almost = varied({
      watched: watched([...range(1, 1, 8), ...range(2, 1, 7)]),
    });
    expect(buildAlmostDone([almost]).items[0]?.timeLeftMinutes).toBe(52);
    expect(buildOutNow([almost], NOW)[0]?.runtimeMinutes).toBe(52);

    const complete = varied({ watched: watched(range(1, 1, 8)) });
    expect(buildOutNow([complete], NOW)[0]?.runtimeMinutes).toBe(305);

    const stale = varied({
      facts: facts({
        episodeRuntime: 55,
        lastEpisodeToAir: ep(2, 8, day(-15)),
      }),
      watched: watched(range(1, 1, 8)),
    });
    expect(buildCatchingUp([stale], NOW)[0]?.runtimeMinutes).toBe(305);
    // each chip's own minutes, for its "2h 52m left"
    expect(buildCatchingUp([stale], NOW)[0]?.episodeRuntimes).toEqual([
      40, 34, 38, 36, 35, 33, 37, 52,
    ]);
  });

  it('falls back to the season’s mean, then the series’ average, then nothing', () => {
    const gap = varied({ runtimes: { 2: [40, 0, 0, 0, 0, 0, 0, 50] } });
    // E6, E7 unknown: the season's mean of 40 and 50
    expect(buildUpNext([gap])[0]?.timeLeftMinutes).toBe(140);

    const none = state({ facts: facts({ episodeRuntime: 55 }) });
    expect(buildUpNext([none])[0]?.timeLeftMinutes).toBe(165);

    const unknown = state({ facts: facts({ episodeRuntime: null }) });
    expect(buildUpNext([unknown])[0]).toMatchObject({
      runtime: null,
      timeLeftMinutes: null,
    });
  });
});

describe('waitingForLater', () => {
  const item = (
    seriesId: number,
    extra: Pick<WaitingForItem, 'state'> & Partial<WaitingForItem>,
  ): WaitingForItem => ({
    nextSeason: 2,
    posterImage: '',
    resumingSoon: false,
    seriesId,
    slug: `s-${seriesId}`,
    title: `Show ${seriesId}`,
    ...extra,
  });

  it('drops returns within 30 days (they are Coming up tickets) and keeps the rest', () => {
    const waiting: WaitingFor = {
      endedCount: 2,
      items: [
        item(1, { daysToGo: 10, nextDate: day(10), state: 'dated' }),
        item(2, { daysToGo: 30, nextDate: day(30), state: 'dated' }),
        item(3, { daysToGo: 45, nextDate: day(45), state: 'dated' }),
        item(4, { state: 'renewed' }),
      ],
    };
    const later = waitingForLater(waiting);
    expect(later.items.map((entry) => entry.seriesId)).toEqual([3, 4]);
    expect(later.endedCount).toBe(2);
  });
});

// Naruto Shippuden: TMDB numbers on across seasons (S2 = E9…E16 here)
describe('episodes numbered on across seasons', () => {
  const seasons = [
    { airDate: '2020-01-01', episodeCount: 8, seasonNumber: 1 },
    {
      airDate: '2021-01-01',
      episodeCount: 8,
      firstEpisodeNumber: 9,
      seasonNumber: 2,
    },
    {
      airDate: day(6),
      episodeCount: 8,
      firstEpisodeNumber: 17,
      seasonNumber: 3,
    },
  ];
  const numberedOn = (overrides: Partial<SeriesFacts> = {}) =>
    facts({ lastEpisodeToAir: ep(2, 16, day(-1)), seasons, ...overrides });

  it('Up next: the season’s real numbers, its finale and its minutes', () => {
    const [item] = buildUpNext([
      state({
        facts: numberedOn(),
        runtimes: {
          2: [
            ...Array.from({ length: 8 }, () => 0),
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
          ],
        },
        watched: watched([...range(1, 1, 8), ...range(2, 9, 15)]),
      }),
    ]);
    expect(item).toMatchObject({
      code: 'S02E16',
      isLatest: true,
      runtime: 47,
      seasonFinale: true,
      seasonTotal: 8,
      seasonWatched: 7,
      timeLeftMinutes: 47,
      toWatch: 1,
    });
    // Indexed by episode − 1, like the series' runtimes
    expect(item?.seasonRuntimes).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 40, 41, 42, 43, 44, 45, 46, 47,
    ]);
  });

  it('Almost done: the season’s first number with the episodes left', () => {
    const almost = state({
      facts: numberedOn(),
      watched: watched([...range(1, 1, 8), ...range(2, 9, 15)]),
    });
    expect(buildAlmostDone([almost]).items[0]).toMatchObject({
      code: 'S02E16',
      firstEpisodeNumber: 9,
      seasonTotal: 8,
      unwatchedEpisodes: [16],
    });
  });

  it('Almost done: a season starting at 1 leaves the first number out', () => {
    const plain = state({
      watched: watched([...range(1, 1, 8), ...range(2, 1, 7)]),
    });
    expect(buildAlmostDone([plain]).items[0]).not.toHaveProperty(
      'firstEpisodeNumber',
    );
  });

  it('Out now: a season that just finished is complete', () => {
    const fresh = state({
      facts: numberedOn(),
      watched: watched(range(1, 1, 8)),
    });
    expect(buildOutNow([fresh], NOW)).toEqual([
      expect.objectContaining({
        episodes: 8,
        kind: 'season-complete',
        season: 2,
      }),
    ]);
  });

  it('Catching up: the next season’s first episode is its premiere', () => {
    const lagging = state({
      facts: numberedOn({
        lastEpisodeToAir: ep(2, 16, day(-30)),
        nextEpisodeToAir: ep(3, 17, day(6)),
      }),
      watched: watched([...range(1, 1, 8), ...range(2, 9, 12)]),
    });
    const [row] = buildCatchingUp([lagging], NOW);
    expect(row?.episodes).toEqual(['S02E13', 'S02E14', 'S02E15', 'S02E16']);
    expect(row?.runway).toEqual({
      date: day(6),
      daysToGo: 6,
      season: 3,
      state: 'upcoming',
    });
  });

  it('Coming up: premiere and finale by the season’s real numbers', () => {
    const tickets = buildComingUp(
      [
        {
          onWatchlist: false,
          state: state({
            facts: numberedOn({ id: 1, nextEpisodeToAir: ep(3, 17, day(6)) }),
          }),
        },
        {
          onWatchlist: false,
          state: state({
            facts: numberedOn({
              id: 2,
              lastEpisodeToAir: ep(2, 15, day(-6)),
              nextEpisodeToAir: ep(2, 16, day(1)),
            }),
          }),
        },
      ],
      NOW,
    );
    expect(tickets.map((ticket) => [ticket.seriesId, ticket.kind])).toEqual([
      [2, 'season-finale'],
      [1, 'season-premiere'],
    ]);
  });
});
