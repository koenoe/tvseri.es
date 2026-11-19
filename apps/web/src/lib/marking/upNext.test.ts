import type { UpNextItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import type { SeriesBase } from './types';
import { liveUpNext } from './upNext';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 11, 12);

const view = (overrides: Partial<SeriesBase> = {}): SeriesBase => ({
  prefs: null,
  seasons: [
    { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
    { airedEpisodeCount: 4, episodeCount: 6, seasonNumber: 2 },
  ],
  seriesId: 7,
  skipped: [],
  status: null,
  watched: {
    S01E01: { runtime: 50, watchedAt: NOW - 9 * DAY },
    S01E02: { runtime: 50, watchedAt: NOW - 8 * DAY },
    S01E03: { runtime: 50, watchedAt: NOW - 7 * DAY },
    S02E01: { runtime: 50, watchedAt: NOW - DAY },
  },
  ...overrides,
});

/** What the overview sends for `view()`: Next up S02E02 */
const item: UpNextItem = {
  airDate: '2026-11-01',
  code: 'S02E02',
  episode: 2,
  episodeTitle: 'Fallen',
  isLatest: false,
  lastWatchedAt: NOW - DAY,
  lastWatchedCode: 'S02E01',
  nextSeasonTba: false,
  nextToAir: { airDate: '2026-11-15', episode: 5, season: 2 },
  posterImage: '/p.jpg',
  runtime: 40,
  season: 2,
  seasonFinale: false,
  // Season 2's lengths vary; E05 and E06 haven't aired (no runtime yet)
  seasonRuntimes: [50, 40, 45, 55, 0, 0],
  seasonTotal: 6,
  seasonWatched: 1,
  seriesId: 7,
  slug: 'show',
  timeLeftMinutes: 140,
  title: 'Show',
  toWatch: 3,
};

describe('liveUpNext', () => {
  it('keeps the server item while the show is not seeded', () => {
    expect(liveUpNext(item, undefined)).toBe(item);
  });

  it('is the server item while its episode is not marked', () => {
    expect(liveUpNext(item, view())).toBe(item);
  });

  it('moves on to the next episode after a mark', () => {
    const marked = view({
      watched: {
        ...view().watched,
        S02E02: { runtime: 0, watchedAt: NOW },
      },
    });
    expect(liveUpNext(item, marked)).toEqual({
      ...item,
      airDate: undefined,
      code: 'S02E03',
      episode: 3,
      episodeTitle: undefined,
      lastWatchedAt: NOW,
      lastWatchedCode: 'S02E02',
      runtime: 45,
      seasonDone: 2,
      seasonWatched: 2,
      // E03 + E04: their own runtimes, never 50 × 2
      timeLeftMinutes: 100,
      toWatch: 2,
    });
  });

  it('says nothing about time when the season’s runtimes are not known', () => {
    const marked = view({
      watched: { ...view().watched, S02E02: { runtime: 0, watchedAt: NOW } },
    });
    const { seasonRuntimes: _, ...older } = item;
    expect(liveUpNext(older, marked)).toMatchObject({
      runtime: null,
      timeLeftMinutes: null,
    });
  });

  it('says nothing about time once it moves on to another season', () => {
    const marked = view({
      seasons: [
        { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 2 },
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 3 },
      ],
      watched: { ...view().watched, S02E02: { runtime: 0, watchedAt: NOW } },
    });
    expect(liveUpNext(item, marked)).toMatchObject({
      code: 'S03E01',
      runtime: null,
      seasonRuntimes: undefined,
      timeLeftMinutes: null,
    });
  });

  it('flags the latest aired episode it moves on to', () => {
    const marked = view({
      watched: {
        ...view().watched,
        S02E02: { runtime: 0, watchedAt: NOW },
        S02E03: { runtime: 0, watchedAt: NOW },
      },
    });
    expect(liveUpNext(item, marked)).toMatchObject({
      code: 'S02E04',
      isLatest: true,
      seasonFinale: false,
      toWatch: 1,
    });
  });

  it('flags a season finale when the whole season has aired', () => {
    const aired = view({
      seasons: [
        { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
        { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 2 },
      ],
      watched: {
        ...view().watched,
        S02E02: { runtime: 0, watchedAt: NOW },
      },
    });
    expect(liveUpNext({ ...item, seasonTotal: 3 }, aired)).toMatchObject({
      code: 'S02E03',
      seasonFinale: true,
      seasonTotal: 3,
    });
  });

  it('flags the finale of a season TMDB numbers on from the last', () => {
    // S2 is E4…E6 (numbered on from S1's E1…E3)
    const aired = view({
      seasons: [
        { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
        {
          airedEpisodeCount: 3,
          episodeCount: 3,
          firstEpisodeNumber: 4,
          seasonNumber: 2,
        },
      ],
      watched: {
        ...view().watched,
        S02E04: { runtime: 0, watchedAt: NOW },
        S02E05: { runtime: 0, watchedAt: NOW },
      },
    });
    const onS2 = { ...item, code: 'S02E05', episode: 5, seasonTotal: 3 };
    expect(liveUpNext(onS2, aired)).toMatchObject({
      code: 'S02E06',
      seasonFinale: true,
      // S02E01 (a made-up code from the fixture's watched) isn't S2's own
      seasonWatched: 2,
    });
  });

  it('carries the season’s first number when it moves into another season', () => {
    const seasons = [
      { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
      {
        airedEpisodeCount: 3,
        episodeCount: 3,
        firstEpisodeNumber: 4,
        seasonNumber: 2,
      },
    ];
    const onS1 = { ...item, code: 'S01E03', episode: 3, season: 1 };
    const moved = liveUpNext(
      onS1,
      view({ seasons, watched: { S01E03: { runtime: 0, watchedAt: NOW } } }),
    );
    expect(moved).toMatchObject({ code: 'S02E04', firstEpisodeNumber: 4 });
    const back = liveUpNext(
      { ...item, code: 'S02E06', episode: 6, firstEpisodeNumber: 4 },
      view({
        seasons: [
          ...seasons,
          { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 3 },
        ],
        watched: {
          S02E06: { runtime: 0, watchedAt: NOW },
        },
      }),
    );
    expect(back?.code).toBe('S03E01');
    expect(back?.firstEpisodeNumber).toBeUndefined();
  });

  it('leaves Up next when nothing aired is left', () => {
    const caughtUp = view({
      skipped: ['S02E04'],
      watched: {
        ...view().watched,
        S02E02: { runtime: 0, watchedAt: NOW },
        S02E03: { runtime: 0, watchedAt: NOW },
      },
    });
    expect(liveUpNext(item, caughtUp)).toBeNull();
  });

  it('never moves on a seed alone, even one that disagrees', () => {
    // The store thinks less has aired, or has an older history: no mark of
    // the item's episode, so the overview's item stands
    const disagrees = view({
      seasons: [
        { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
        { airedEpisodeCount: 1, episodeCount: 6, seasonNumber: 2 },
      ],
      watched: {},
    });
    expect(liveUpNext(item, disagrees)).toBe(item);
  });

  it('skips past episodes already marked after the item', () => {
    const marked = view({
      skipped: ['S02E03'],
      watched: {
        ...view().watched,
        S02E02: { runtime: 0, watchedAt: NOW },
      },
    });
    expect(liveUpNext(item, marked)).toMatchObject({
      code: 'S02E04',
      toWatch: 1,
    });
  });
});
