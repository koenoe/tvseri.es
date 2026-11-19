import { episodeCode } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { isDone, listStateOf, seasonCounts, showProgress } from './progress';

// A normal show: S1 E1–E3 all aired, S2 E1–E2 aired of more announced
const normal = [
  { airedCount: 3, seasonNumber: 1 },
  { airedCount: 2, seasonNumber: 2 },
];

// Naruto-shaped: TMDB numbers on across seasons. S1 is E1–E3, S2 E4–E6 (two
// aired), S3 announced with nothing aired yet
const numberedOn = [
  { airedCount: 3, seasonNumber: 1 },
  { airedCount: 2, firstEpisodeNumber: 4, seasonNumber: 2 },
  { airedCount: 0, firstEpisodeNumber: 7, seasonNumber: 3 },
];

const codes = (
  progress: Readonly<{
    open: ReadonlyArray<{ seasonNumber: number; episodeNumber: number }>;
  }>,
) => progress.open.map(episodeCode);

describe('showProgress', () => {
  it('counts a normal show’s aired episodes and what is still open', () => {
    const progress = showProgress({
      seasons: normal,
      skipped: ['S01E03'],
      watched: ['S01E01', 'S01E02'],
    });
    expect(progress.aired).toHaveLength(5);
    expect(progress.watched).toBe(2);
    expect(progress.skipped).toBe(1);
    expect(progress.done).toBe(3);
    expect(codes(progress)).toEqual(['S02E01', 'S02E02']);
    expect(progress.nextUp).toEqual({ episodeNumber: 1, seasonNumber: 2 });
    expect(progress.started).toBe(true);
    expect(progress.isComplete).toBe(false);
    expect(progress.isFinished).toBe(false);
  });

  it('reads a numbered-on show by its real episode numbers', () => {
    const progress = showProgress({
      seasons: numberedOn,
      skipped: [],
      watched: ['S01E01', 'S01E02', 'S01E03', 'S02E04'],
    });
    expect(progress.aired).toHaveLength(5);
    expect(progress.watched).toBe(4);
    expect(codes(progress)).toEqual(['S02E05']);
  });

  it('never lets a mark outside the aired episodes close an open one', () => {
    // Every aired episode but S02E05 watched, plus a made-up S02E01 (below
    // S2's first number) and S02E06 (not aired yet), watched and skipped
    const progress = showProgress({
      seasons: numberedOn,
      skipped: ['S02E06', 'S02E07'],
      watched: ['S01E01', 'S01E02', 'S01E03', 'S02E04', 'S02E01', 'S02E06'],
    });
    expect(progress.watched).toBe(4);
    expect(progress.skipped).toBe(0);
    expect(progress.done).toBe(4);
    expect(codes(progress)).toEqual(['S02E05']);
    expect(progress.isFinished).toBe(false);
    expect(listStateOf(progress)).toBe('in_progress');
  });

  it('is complete with every aired episode watched, specials aside', () => {
    const progress = showProgress({
      seasons: [{ airedCount: 2, seasonNumber: 0 }, ...normal],
      skipped: [],
      watched: ['S01E01', 'S01E02', 'S01E03', 'S02E01', 'S02E02'],
    });
    expect(progress.aired).toHaveLength(5);
    expect(progress.isComplete).toBe(true);
    expect(progress.isFinished).toBe(true);
    expect(progress.nextUp).toBeNull();
    expect(listStateOf(progress)).toBe('watched');
  });

  it('is finished, not complete, when the rest is skipped', () => {
    const progress = showProgress({
      seasons: normal,
      skipped: ['S02E01', 'S02E02'],
      watched: ['S01E01', 'S01E02', 'S01E03'],
    });
    expect(progress.isComplete).toBe(false);
    expect(progress.isFinished).toBe(true);
    expect(progress.done).toBe(5);
    expect(listStateOf(progress)).toBe('watched');
  });

  it('counts a skip that is also watched once, as watched', () => {
    const progress = showProgress({
      seasons: normal,
      skipped: ['S01E01'],
      watched: ['S01E01'],
    });
    expect(progress.watched).toBe(1);
    expect(progress.skipped).toBe(0);
    expect(progress.done).toBe(1);
  });

  it('is not started by specials, nor by skips alone', () => {
    const specials = showProgress({
      seasons: normal,
      skipped: [],
      watched: ['S00E01'],
    });
    expect(specials.started).toBe(false);
    expect(listStateOf(specials)).toBe('none');
    const skips = showProgress({
      seasons: normal,
      skipped: ['S01E01', 'S01E02', 'S01E03', 'S02E01', 'S02E02'],
      watched: [],
    });
    expect(skips.started).toBe(false);
    expect(skips.isFinished).toBe(false);
    expect(listStateOf(skips)).toBe('none');
  });

  it('is started by any regular watched row, aired or not', () => {
    const progress = showProgress({
      seasons: normal,
      skipped: [],
      watched: ['S02E09'],
    });
    expect(progress.started).toBe(true);
    expect(progress.watched).toBe(0);
    expect(listStateOf(progress)).toBe('in_progress');
  });

  it('places a show with nothing aired in no list', () => {
    const progress = showProgress({
      seasons: [{ airedCount: 0, seasonNumber: 1 }],
      skipped: [],
      watched: ['S01E01'],
    });
    expect(progress.isFinished).toBe(false);
    expect(listStateOf(progress)).toBe('none');
  });

  it('breaks the counts down per season', () => {
    const progress = showProgress({
      seasons: numberedOn,
      skipped: ['S02E05'],
      watched: ['S01E01', 'S02E04', 'S02E01'],
    });
    expect(progress.seasons).toEqual([
      { aired: 3, done: 1, open: 2, seasonNumber: 1, skipped: 0, watched: 1 },
      { aired: 2, done: 2, open: 0, seasonNumber: 2, skipped: 1, watched: 1 },
      { aired: 0, done: 0, open: 0, seasonNumber: 3, skipped: 0, watched: 0 },
    ]);
  });
});

describe('seasonCounts', () => {
  it('counts one season by the same rule, specials included', () => {
    expect(
      seasonCounts(
        { airedCount: 3, seasonNumber: 0 },
        { skipped: ['S00E02'], watched: ['S00E01', 'S00E09'] },
      ),
    ).toEqual({
      aired: 3,
      done: 2,
      open: 1,
      seasonNumber: 0,
      skipped: 1,
      watched: 1,
    });
  });
});

describe('isDone', () => {
  it('is done with one watched and nothing aired left open, skips included', () => {
    expect(isDone({ open: 0, watched: 2 })).toBe(true);
  });

  it('is not done with anything open, nor by skips alone', () => {
    expect(isDone({ open: 1, watched: 2 })).toBe(false);
    expect(isDone({ open: 0, watched: 0 })).toBe(false);
  });
});
