import { describe, expect, it } from 'vitest';

import {
  episodeState,
  hasHistory,
  nextEpisode,
  openBefore,
  openEpisodes,
  seasonProgress,
  seriesProgress,
  toPercentage,
  unwatchedInSeason,
  unwatchedRegularEpisodes,
} from './progress';
import type { SeriesBase } from './types';

const base = (overrides: Partial<SeriesBase> = {}): SeriesBase => ({
  prefs: null,
  seasons: [
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
    { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
    { airedEpisodeCount: 2, episodeCount: 4, seasonNumber: 2 },
  ],
  seriesId: 1,
  skipped: [],
  status: null,
  watched: {},
  ...overrides,
});

const at = (watchedAt: number) => ({ runtime: 30, watchedAt });

describe('nextEpisode', () => {
  it('is the first aired regular episode when nothing is watched', () => {
    expect(nextEpisode(base())).toEqual({ episodeNumber: 1, seasonNumber: 1 });
  });

  it('crosses into the next season once a season is fully marked', () => {
    const series = base({
      skipped: ['S01E02'],
      watched: { S01E01: at(1), S01E03: at(1) },
    });
    expect(nextEpisode(series)).toEqual({ episodeNumber: 1, seasonNumber: 2 });
  });

  it('skips skipped episodes', () => {
    const series = base({ skipped: ['S01E02'], watched: { S01E01: at(1) } });
    expect(nextEpisode(series)).toEqual({ episodeNumber: 3, seasonNumber: 1 });
  });

  it('is the first aired episode with no mark, even before the last watched one', () => {
    const series = base({
      watched: { S01E01: at(1), S02E01: at(1), S02E02: at(1) },
    });
    expect(nextEpisode(series)).toEqual({ episodeNumber: 2, seasonNumber: 1 });
    // Unmarking S01E02 after watching on makes it Next up again.
    const unmarked = base({
      watched: { S01E01: at(1), S01E03: at(1) },
    });
    expect(nextEpisode(unmarked)).toEqual({
      episodeNumber: 2,
      seasonNumber: 1,
    });
  });

  it('is null when everything aired is watched; specials never count', () => {
    const series = base({
      watched: {
        S01E01: at(1),
        S01E02: at(1),
        S01E03: at(1),
        S02E01: at(1),
        S02E02: at(1),
      },
    });
    expect(nextEpisode(series)).toBeNull();
  });
});

describe('only specials watched', () => {
  it('leaves Next up on S01E01 and the show at 0%, never complete', () => {
    const series = base({ watched: { S00E01: at(1), S00E02: at(1) } });
    expect(nextEpisode(series)).toEqual({ episodeNumber: 1, seasonNumber: 1 });
    expect(seriesProgress(series)).toMatchObject({
      isComplete: false,
      percentage: 0,
      toWatch: 5,
      watched: 0,
    });
  });

  it('finishes a show on its regular episodes, specials unwatched', () => {
    const series = base({
      watched: {
        S01E01: at(1),
        S01E02: at(1),
        S01E03: at(1),
        S02E01: at(1),
        S02E02: at(1),
      },
    });
    expect(seriesProgress(series).isComplete).toBe(true);
  });
});

describe('progress', () => {
  it('counts aired regular episodes; skipped is not watched', () => {
    const series = base({
      skipped: ['S01E03'],
      watched: {
        S00E01: at(1),
        S01E01: at(1),
        S01E02: { ...at(1), dateUnknown: true },
      },
    });
    expect(seriesProgress(series)).toEqual({
      aired: 5,
      isComplete: false,
      isFinished: false,
      left: 2,
      percentage: 40,
      toWatch: 3,
      watched: 2,
      watchedRuntime: 90,
    });
    expect(seasonProgress(series, 1)).toEqual({
      aired: 3,
      isComplete: false,
      seasonNumber: 1,
      skipped: 1,
      total: 3,
      watched: 2,
    });
  });

  it('a season is complete only when every aired episode is watched', () => {
    const series = base({ watched: { S02E01: at(1), S02E02: at(1) } });
    expect(seasonProgress(series, 2).isComplete).toBe(true);
    expect(seasonProgress(series, 2).total).toBe(4);
  });

  it('finished (the lists): every aired episode watched or skipped, one watched at least', () => {
    const rest = { S01E01: at(1), S01E02: at(1), S01E03: at(1) };
    const skippedRest = base({
      skipped: ['S02E01', 'S02E02', 'S02E03'],
      watched: rest,
    });
    // Complete stays "every aired episode watched": the eye still marks
    // the skipped ones
    expect(seriesProgress(skippedRest)).toMatchObject({
      isComplete: false,
      isFinished: true,
      left: 0,
    });
    const onlySkipped = base({
      skipped: ['S01E01', 'S01E02', 'S01E03', 'S02E01', 'S02E02'],
    });
    expect(seriesProgress(onlySkipped)).toMatchObject({
      isFinished: false,
      left: 0,
    });
    // A skip of an episode yet to air finishes nothing
    const unaired = base({ skipped: ['S02E03'], watched: rest });
    expect(seriesProgress(unaired)).toMatchObject({
      isFinished: false,
      left: 2,
    });
  });

  it('left: aired, not watched, not skipped, in order', () => {
    const series = base({ skipped: ['S01E02'], watched: { S01E01: at(1) } });
    expect(openEpisodes(series)).toEqual([
      { episodeNumber: 3, seasonNumber: 1 },
      { episodeNumber: 1, seasonNumber: 2 },
      { episodeNumber: 2, seasonNumber: 2 },
    ]);
  });

  it('rounds like production: floor, never 0 once started', () => {
    expect(toPercentage(1, 300)).toBe(1);
    expect(toPercentage(1, 1000)).toBe(1);
    expect(toPercentage(21, 47)).toBe(44);
    expect(toPercentage(0, 0)).toBe(0);
    expect(toPercentage(0, 10)).toBe(0);
  });

  it('is 100 only when everything is watched', () => {
    expect(toPercentage(999, 1000)).toBe(99);
    expect(toPercentage(10, 10)).toBe(100);
  });

  it('keeps whole shares exact (0.57 * 100 is 56.99…)', () => {
    expect(toPercentage(57, 100)).toBe(57);
    expect(toPercentage(29, 50)).toBe(58);
  });
});

describe('episode helpers', () => {
  it('draws watched, unknown, skipped and none', () => {
    const series = base({
      skipped: ['S01E03'],
      watched: { S01E01: at(1), S01E02: { ...at(1), dateUnknown: true } },
    });
    const state = (episodeNumber: number) =>
      episodeState(series, { episodeNumber, seasonNumber: 1 });
    expect([1, 2, 3].map(state)).toEqual(['watched', 'unknown', 'skipped']);
    expect(episodeState(series, { episodeNumber: 1, seasonNumber: 2 })).toBe(
      'none',
    );
  });

  it('asks about open episodes before, not skipped ones', () => {
    const series = base({ skipped: ['S01E01'] });
    expect(openBefore(series, { episodeNumber: 3, seasonNumber: 1 })).toEqual([
      { episodeNumber: 2, seasonNumber: 1 },
    ]);
  });

  it('a season mark includes skipped episodes', () => {
    const series = base({ skipped: ['S01E02'], watched: { S01E01: at(1) } });
    expect(unwatchedInSeason(series, 1)).toEqual([
      { episodeNumber: 2, seasonNumber: 1 },
      { episodeNumber: 3, seasonNumber: 1 },
    ]);
  });

  it('a whole-series mark takes aired regular episodes not watched, skipped included', () => {
    const series = base({
      skipped: ['S01E02'],
      watched: {
        S00E01: at(1),
        S01E01: at(1),
        S02E01: { ...at(1), dateUnknown: true },
      },
    });
    expect(unwatchedRegularEpisodes(series)).toEqual([
      { episodeNumber: 2, seasonNumber: 1 },
      { episodeNumber: 3, seasonNumber: 1 },
      { episodeNumber: 2, seasonNumber: 2 },
    ]);
  });
});

describe('specials and unknown seasons', () => {
  it('specials alone are no history of the series', () => {
    expect(hasHistory(base({ watched: { S00E01: at(1) } }))).toBe(false);
    expect(hasHistory(base({ skipped: ['S00E02'] }))).toBe(false);
    expect(hasHistory(base({ skipped: ['S01E01'] }))).toBe(true);
    expect(hasHistory(base({ watched: { S02E01: at(1) } }))).toBe(true);
  });

  it('never asks about the specials before a special', () => {
    expect(openBefore(base(), { episodeNumber: 2, seasonNumber: 0 })).toEqual(
      [],
    );
  });

  it('a season the show doesn’t list has nothing aired, so it is never complete', () => {
    const series = base({ watched: { S07E01: at(1) } });
    expect(seasonProgress(series, 7)).toEqual({
      aired: 0,
      isComplete: false,
      seasonNumber: 7,
      skipped: 0,
      total: 0,
      watched: 0,
    });
    expect(unwatchedInSeason(series, 7)).toEqual([]);
  });
});
