import { describe, expect, it } from 'vitest';

import { getSeriesPrefs, updateSeriesPrefs } from '@/lib/db/prefs';
import {
  eraseMarks,
  recordMarks,
  recordScopeMark,
  type WatchSource,
} from '@/lib/watchLog';
import {
  SeasonNotAiredError,
  TooManyEpisodesError,
} from '@/lib/watchLog/errors';
import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { seedWatched } from './library';
import { seedUser, USER_ID } from './seed';
import { listItems } from './stream';

// Module caches keep TMDB series between tests: one show id per test
let nextShow = 7800;
const newShow = () => {
  nextShow += 1;
  fakeShow({
    id: nextShow,
    seasons: [
      { airDate: '2020-01-01', episodes: 3 },
      { airDate: '2099-01-01', aired: 0, episodes: 2 },
    ],
  });
  seedUser();
  return nextShow;
};

const mark = (show: number, episode: number) => ({
  episode: {
    airDate: '2020-01-01',
    episodeNumber: episode,
    runtime: 30,
    seasonNumber: 1,
    stillPath: null,
    title: `Episode ${episode}`,
  },
  tvSeries: { id: show, posterPath: '/p.jpg', slug: 'show', title: 'Show' },
  watchedAt: Date.UTC(2025, 0, 1),
});

const codes = () =>
  db
    .dump('Watched')
    .map((row) => `S${row.seasonNumber}E${row.episodeNumber}`)
    .sort();

const listed = () =>
  listItems(USER_ID)
    .map((item) => String(item.sk))
    .filter((sk) => sk.startsWith('LIST#'));

const hideAndSkip = (show: number) =>
  updateSeriesPrefs(USER_ID, show, {
    paused: 'hide',
    skip: ['S01E01', 'S01E02'],
  });

describe('recordMarks: what follows the write, per source', () => {
  it.each<[WatchSource, { paused: string | null; placed: boolean }]>([
    ['viewer', { paused: null, placed: true }],
    ['restore', { paused: 'hide', placed: true }],
    ['import', { paused: 'hide', placed: false }],
    ['scrobble', { paused: null, placed: false }],
  ])('%s', async (source, expected) => {
    const show = newShow();
    await hideAndSkip(show);

    const items = await recordMarks(USER_ID, [mark(show, 1), mark(show, 1)], {
      source,
    });

    expect(items).toHaveLength(1);
    expect(codes()).toEqual(['S1E1']);
    const prefs = await getSeriesPrefs(USER_ID, show);
    expect(prefs.skipped).toEqual(['S01E02']);
    expect(prefs.paused).toBe(expected.paused);
    expect(listed()).toEqual(
      expected.placed ? [`LIST#IN_PROGRESS#ITEM#${show}`] : [],
    );
  });

  it('an import that reads its own skips clears only those', async () => {
    const show = newShow();
    await hideAndSkip(show);

    await recordMarks(USER_ID, [mark(show, 1), mark(show, 2)], {
      source: 'import',
      unskipped: async () => new Map([[show, new Set(['S01E02'])]]),
    });

    expect((await getSeriesPrefs(USER_ID, show)).skipped).toEqual(['S01E01']);
  });
});

describe('recordScopeMark', () => {
  it('writes the aired episodes left, and answers undefined for a show TMDB lacks', async () => {
    const show = newShow();
    seedWatched(USER_ID, show, [[1, 1]]);

    const items = await recordScopeMark(
      USER_ID,
      { seriesId: show },
      { watchProvider: Promise.resolve(null), when: { watchedAt: 1 } },
    );

    expect(items?.map((item) => item.episodeNumber)).toEqual([1, 2, 3]);
    expect(codes()).toEqual(['S1E1', 'S1E2', 'S1E3']);
    expect(
      await recordScopeMark(
        USER_ID,
        { seriesId: 1 },
        { watchProvider: null, when: { watchedAt: 1 } },
      ),
    ).toBeUndefined();
  });

  it('throws its own errors, before anything is written', async () => {
    const show = newShow();
    await expect(
      recordScopeMark(
        USER_ID,
        { seasonNumber: 2, seriesId: show },
        { watchProvider: null, when: { watchedAt: 1 } },
      ),
    ).rejects.toBeInstanceOf(SeasonNotAiredError);

    nextShow += 1;
    fakeShow({
      id: nextShow,
      seasons: [{ airDate: '1980-01-01', episodes: 1001 }],
    });
    await expect(
      recordScopeMark(
        USER_ID,
        { seriesId: nextShow },
        { watchProvider: null, when: { watchedAt: 1 } },
      ),
    ).rejects.toBeInstanceOf(TooManyEpisodesError);
    expect(codes()).toEqual([]);
  });
});

describe('eraseMarks', () => {
  it('erases episodes or a scope, leaves the prefs and places the show', async () => {
    const show = newShow();
    seedWatched(USER_ID, show, [
      [0, 1],
      [1, 1],
      [1, 2],
    ]);
    await hideAndSkip(show);

    expect(
      await eraseMarks(USER_ID, {
        episodes: [{ episodeNumber: 1, seasonNumber: 1, seriesId: show }],
      }),
    ).toBe(true);
    expect(codes()).toEqual(['S0E1', 'S1E2']);
    expect(listed()).toEqual([`LIST#IN_PROGRESS#ITEM#${show}`]);

    expect(await eraseMarks(USER_ID, { seriesId: show })).toBe(true);
    expect(codes()).toEqual(['S0E1']);
    expect(listed()).toEqual([]);
    expect(await getSeriesPrefs(USER_ID, show)).toMatchObject({
      paused: 'hide',
      skipped: ['S01E01', 'S01E02'],
    });
    expect(await eraseMarks(USER_ID, { seriesId: 1 })).toBe(false);
  });
});
