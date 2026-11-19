import { describe, expect, it } from 'vitest';

import {
  applyOp,
  applyPending,
  libraryAfter,
  recordOf,
  restoreOps,
  seedToBase,
  withMembership,
} from './state';

const seed = seedToBase({
  seasons: [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }],
  seriesId: 7,
  status: {
    isFavorited: false,
    isWatchlisted: true,
    prefs: {
      firstTrackingAnsweredAt: null,
      neverAskBefore: false,
      skipped: ['S01E03'],
    },
  },
  watched: [
    { episodeNumber: 1, seasonNumber: 1, watchedAt: 100 },
    {
      dateUnknown: true,
      episodeNumber: 2,
      runtime: 25,
      seasonNumber: 1,
      watchedAt: 200,
    },
  ],
});

describe('seedToBase', () => {
  it('keys records by episode code and keeps the flags', () => {
    expect(seed.watched).toEqual({
      S01E01: { runtime: 0, watchedAt: 100 },
      S01E02: { dateUnknown: true, runtime: 25, watchedAt: 200 },
    });
    expect(seed.skipped).toEqual(['S01E03']);
    expect(seed.status).toEqual({ isFavorited: false, isWatchlisted: true });
  });

  it('is signed-out shaped without a status', () => {
    const signedOut = seedToBase({ seasons: [], seriesId: 1 });
    expect(signedOut.status).toBeNull();
    expect(signedOut.prefs).toBeNull();
  });
});

describe('applyOp', () => {
  it('a mark clears skipped for those episodes', () => {
    const next = applyOp(seed, {
      kind: 'mark',
      records: { S01E03: { runtime: 0, watchedAt: 300 } },
    });
    expect(next.skipped).toEqual([]);
    expect(next.watched.S01E03).toEqual({ runtime: 0, watchedAt: 300 });
  });

  it('unmark, skip, list and prefs', () => {
    const next = [
      { codes: ['S01E01'], kind: 'unmark' } as const,
      { codes: ['S01E01'], kind: 'skip' } as const,
      { kind: 'list', list: 'favorites', value: true } as const,
      { kind: 'prefs', patch: { neverAskBefore: true } } as const,
    ].reduce(applyOp, seed);
    expect(next.watched.S01E01).toBeUndefined();
    expect(next.skipped).toEqual(['S01E01', 'S01E03']);
    expect(next.status).toEqual({ isFavorited: true, isWatchlisted: true });
    expect(next.prefs?.neverAskBefore).toBe(true);
  });

  it('pending ops apply in order on top of the base', () => {
    const view = applyPending(seed, [
      { id: 1, op: { codes: ['S01E02'], kind: 'unmark' } },
      {
        id: 2,
        op: { kind: 'mark', records: { S01E02: { runtime: 0, watchedAt: 9 } } },
      },
    ]);
    expect(view.watched.S01E02).toEqual({ runtime: 0, watchedAt: 9 });
  });
});

describe('restoreOps (Undo)', () => {
  it('puts records, unwatched and skipped episodes back exactly', () => {
    const after = [
      {
        kind: 'mark',
        records: {
          S01E01: { runtime: 0, watchedAt: 999 },
          S01E02: { runtime: 0, watchedAt: 999 },
          S01E03: { runtime: 0, watchedAt: 999 },
        },
      } as const,
    ].reduce(applyOp, seed);
    const restored = restoreOps(seed, after, [
      'S01E01',
      'S01E02',
      'S01E03',
    ]).reduce(applyOp, after);
    expect(restored.watched).toEqual(seed.watched);
    expect(restored.skipped).toEqual(seed.skipped);
  });
});

describe('restoreOps after a skip', () => {
  it('unskips what was not skipped before', () => {
    const after = applyOp(seed, { codes: ['S01E01'], kind: 'unmark' });
    const skippedNow = applyOp(after, { codes: ['S01E01'], kind: 'skip' });
    expect(restoreOps(seed, skippedNow, ['S01E01'])).toEqual([
      { kind: 'mark', records: { S01E01: { runtime: 0, watchedAt: 100 } } },
    ]);
    expect(restoreOps(after, skippedNow, ['S01E01'])).toEqual([
      { codes: ['S01E01'], kind: 'unskip' },
    ]);
  });
});

describe('libraryAfter: the lists the API will place the show in', () => {
  const empty = { favorites: [], inProgress: [], watched: [], watchlist: [] };

  it('the rest skipped: Finished, as the API places it', () => {
    expect(libraryAfter(empty, 7, seed)).toMatchObject({
      inProgress: [],
      watched: [7],
    });
  });

  it('an unskip with nothing else changed: back to In progress', () => {
    const unskipped = { ...seed, skipped: [] };
    expect(libraryAfter(empty, 7, unskipped)).toMatchObject({
      inProgress: [7],
      watched: [],
    });
  });

  it('specials alone put the show in no list', () => {
    const specials = seedToBase({
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
        { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
      ],
      seriesId: 7,
      watched: [{ episodeNumber: 1, seasonNumber: 0, watchedAt: 1 }],
    });
    expect(libraryAfter(empty, 7, specials)).toBe(empty);
  });

  it('started with nothing aired: the API can’t place it, so its lists stay', () => {
    const premiere = seedToBase({
      seasons: [{ airedEpisodeCount: 0, episodeCount: 8, seasonNumber: 1 }],
      seriesId: 7,
      watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1 }],
    });
    const listed = { ...empty, inProgress: [7] };
    expect(libraryAfter(listed, 7, premiere)).toBe(listed);
    expect(libraryAfter(empty, 7, premiere)).toBe(empty);
  });

  it('the same ids when the show stays where it is', () => {
    const ids = { ...empty, watched: [7], watchlist: [7] };
    expect(libraryAfter(ids, 7, seed)).toBe(ids);
  });
});

describe('withMembership: one show list changed, in the API order', () => {
  const ids = { favorites: [2, 9], inProgress: [], watched: [], watchlist: [] };

  it('adds in ascending order, once', () => {
    expect(withMembership(ids, 'favorites', [5, 9, 1], true).favorites).toEqual(
      [1, 2, 5, 9],
    );
  });

  it('removes', () => {
    expect(withMembership(ids, 'favorites', [9, 4], false).favorites).toEqual([
      2,
    ]);
  });

  it('the same ids when nothing changes', () => {
    expect(withMembership(ids, 'favorites', [2], true)).toBe(ids);
    expect(withMembership(ids, 'watchlist', [2], false)).toBe(ids);
  });
});

describe('recordOf: the optimistic record a mark draws until the server answers', () => {
  const prior = { runtime: 42, source: 'Plex', watchedAt: 100 };

  it('keeps the runtime it had, never the old date or flags', () => {
    expect(recordOf({ kind: 'now' }, 900, prior)).toEqual({
      runtime: 42,
      watchedAt: 900,
    });
    expect(recordOf({ kind: 'date', watchedAt: 500 }, 900, prior)).toEqual({
      runtime: 42,
      watchedAt: 500,
    });
    expect(recordOf({ kind: 'unknown' }, 900)).toEqual({
      dateUnknown: true,
      runtime: 0,
      watchedAt: 900,
    });
  });

  it('release keeps what is there: only the server knows the air dates', () => {
    expect(recordOf({ kind: 'release', tzOffsetMinutes: 0 }, 900, prior)).toBe(
      prior,
    );
    expect(recordOf({ kind: 'release', tzOffsetMinutes: 0 }, 900)).toEqual({
      runtime: 0,
      watchedAt: 900,
    });
  });
});
