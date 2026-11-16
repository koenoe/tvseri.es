import { describe, expect, it } from 'vitest';

import { episodeMinutes, minutesFor, resolveSeasonMinutes } from './minutesFor';

// A season whose episode lengths vary (a pilot, a short one, a long finale)
const VARIED = { 1: [40, 34, 38, 36, 35, 33, 37, 34, 39, 52] } as const;

describe('episodeMinutes', () => {
  it('is the episode’s own runtime when TMDB has one', () => {
    expect(episodeMinutes(VARIED, { episode: 10, season: 1 }, 55)).toBe(52);
  });

  it('falls back to the mean of the season’s known runtimes', () => {
    const runtimes = { 1: [40, 0, 50] };
    expect(episodeMinutes(runtimes, { episode: 2, season: 1 }, 60)).toBe(45);
    // an episode past the end of the list is unknown too
    expect(episodeMinutes(runtimes, { episode: 4, season: 1 }, 60)).toBe(45);
  });

  it('uses the series’ average only when the season has no runtime at all', () => {
    expect(episodeMinutes({ 1: [0, 0] }, { episode: 1, season: 1 }, 42)).toBe(
      42,
    );
    expect(episodeMinutes({}, { episode: 1, season: 2 }, 42)).toBe(42);
  });

  it('invents nothing: null when nothing is known', () => {
    expect(
      episodeMinutes({ 1: [0, 0] }, { episode: 1, season: 1 }, null),
    ).toBeNull();
    expect(episodeMinutes(undefined, { episode: 1, season: 1 }, 0)).toBeNull();
  });
});

describe('minutesFor', () => {
  it('sums the real runtimes, never one runtime × the count', () => {
    const left = [8, 9, 10].map((episode) => ({ episode, season: 1 }));
    // 34 + 39 + 52, where 3 × the series' 55 would say 165
    expect(minutesFor(left, VARIED, 55)).toBe(125);
  });

  it('spans seasons', () => {
    const runtimes = { 1: [30, 30], 2: [60] };
    const refs = [
      { episode: 2, season: 1 },
      { episode: 1, season: 2 },
    ];
    expect(minutesFor(refs, runtimes, null)).toBe(90);
  });

  it('is 0 for nothing left and null when any episode is unknown', () => {
    expect(minutesFor([], VARIED, null)).toBe(0);
    expect(minutesFor([{ episode: 1, season: 3 }], VARIED, null)).toBeNull();
  });
});

describe('resolveSeasonMinutes', () => {
  it('fills the gaps by the same rule, 0 where nothing is known', () => {
    expect(resolveSeasonMinutes({ 1: [40, 0, 50] }, 1, 3, 60)).toEqual([
      40, 45, 50,
    ]);
    expect(resolveSeasonMinutes({}, 1, 2, 30)).toEqual([30, 30]);
    expect(resolveSeasonMinutes({}, 1, 2, null)).toEqual([0, 0]);
  });
});
