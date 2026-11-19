import { describe, expect, it } from 'vitest';

import { decideListState } from './state';

// The rule itself (aired, skipped, specials, marks outside the aired
// episodes) is `showProgress`'s, tested in packages/utils: these prove the
// API's seasons reach it.
describe('decideListState', () => {
  it('is watched once every aired episode is watched or skipped', () => {
    const seasons = [
      { numberOfAiredEpisodes: 2, seasonNumber: 1 },
      { numberOfAiredEpisodes: 1, seasonNumber: 2 },
    ];
    expect(
      decideListState({
        seasons,
        skipped: ['S02E01'],
        watched: ['S01E01', 'S01E02'],
      }),
    ).toBe('watched');
    expect(
      decideListState({ seasons, skipped: [], watched: ['S01E01', 'S01E02'] }),
    ).toBe('in_progress');
  });

  it('counts by the real episode numbers where TMDB numbers on across seasons', () => {
    // Season 2 is E5…E8, 2 of them aired; S02E01 is a made-up code
    const numberedOn = [
      { numberOfAiredEpisodes: 4, seasonNumber: 1 },
      { firstEpisodeNumber: 5, numberOfAiredEpisodes: 2, seasonNumber: 2 },
    ];
    const s1 = ['S01E01', 'S01E02', 'S01E03', 'S01E04'];
    expect(
      decideListState({
        seasons: numberedOn,
        skipped: ['S02E06'],
        watched: [...s1, 'S02E05'],
      }),
    ).toBe('watched');
    expect(
      decideListState({
        seasons: numberedOn,
        skipped: ['S02E01'],
        watched: [...s1, 'S02E05', 'S02E02'],
      }),
    ).toBe('in_progress');
  });
});
