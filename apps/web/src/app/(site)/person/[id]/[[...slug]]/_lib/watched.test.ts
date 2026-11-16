import { describe, expect, it } from 'vitest';

import { creditWatched, watchedLine } from './watched';

describe('creditWatched', () => {
  it('says a complete credit with the ✓ copy', () => {
    expect(
      creditWatched({
        episodeCount: 62,
        episodesWatched: 62,
        state: 'watched',
      }),
    ).toEqual({
      complete: true,
      count: '62 of 62 watched',
      row: 'Watched',
      short: 'Watched',
    });
  });

  it('counts a partial credit', () => {
    expect(
      creditWatched({
        episodeCount: 20,
        episodesWatched: 10,
        state: 'in-progress',
      }),
    ).toEqual({
      complete: false,
      count: '10 of 20 watched',
      row: '10 of 20 watched',
      short: '10 of 20',
    });
  });

  it('copes with a credit TMDB has no episode count for', () => {
    expect(
      creditWatched({
        episodeCount: 0,
        episodesWatched: 3,
        state: 'in-progress',
      }).count,
    ).toBe('3 watched');
  });
});

describe('watchedLine', () => {
  it('says episodes and shows', () => {
    expect(
      watchedLine({ episodes: 74, items: [], shows: 3, totalShows: 67 }),
    ).toEqual({ episodes: '74 episodes', shows: '3 of 67 series' });
    expect(
      watchedLine({ episodes: 1, items: [], shows: 1, totalShows: 1 }),
    ).toEqual({ episodes: '1 episode', shows: '1 of 1 series' });
  });
});
