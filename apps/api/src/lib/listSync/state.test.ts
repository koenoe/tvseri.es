import { describe, expect, it } from 'vitest';

import { decideListState } from './state';

// Season 1: 4 aired; season 2: 2 of its episodes aired
const seasons = [
  { numberOfAiredEpisodes: 4, seasonNumber: 1 },
  { numberOfAiredEpisodes: 2, seasonNumber: 2 },
];
const allAired = ['S01E01', 'S01E02', 'S01E03', 'S01E04', 'S02E01', 'S02E02'];

describe('decideListState', () => {
  it('is watched when every aired episode is watched', () => {
    expect(decideListState({ seasons, skipped: [], watched: allAired })).toBe(
      'watched',
    );
  });

  it('stays watched with more watched than TMDB says aired', () => {
    expect(
      decideListState({
        seasons,
        skipped: [],
        watched: [...allAired, 'S02E03'],
      }),
    ).toBe('watched');
  });

  it('is in progress with an aired episode open', () => {
    expect(
      decideListState({ seasons, skipped: [], watched: allAired.slice(1) }),
    ).toBe('in_progress');
  });

  it('stays in progress when a watched row outside the aired episodes would make up the count', () => {
    // 6 watched rows for 6 aired, but S01E01 is open: S02E03 hasn't aired
    expect(
      decideListState({
        seasons,
        skipped: [],
        watched: [...allAired.slice(1), 'S02E03'],
      }),
    ).toBe('in_progress');
  });

  it('is none with nothing watched', () => {
    expect(decideListState({ seasons, skipped: [], watched: [] })).toBe('none');
  });

  it('is none when nothing has aired', () => {
    expect(
      decideListState({
        seasons: [{ numberOfAiredEpisodes: 0, seasonNumber: 1 }],
        skipped: [],
        watched: ['S01E01'],
      }),
    ).toBe('none');
  });

  it('is watched when the rest of the aired episodes are skipped', () => {
    expect(
      decideListState({
        seasons,
        skipped: ['S02E01', 'S02E02'],
        watched: allAired.slice(0, 4),
      }),
    ).toBe('watched');
  });

  it('never finishes on a skip of an episode yet to air', () => {
    expect(
      decideListState({
        seasons,
        skipped: ['S02E02', 'S02E03'],
        watched: allAired.slice(0, 5),
      }),
    ).toBe('watched');
    expect(
      decideListState({
        seasons,
        skipped: ['S02E03'],
        watched: allAired.slice(0, 5),
      }),
    ).toBe('in_progress');
  });

  it('is none with only skips: something has to be watched', () => {
    expect(decideListState({ seasons, skipped: allAired, watched: [] })).toBe(
      'none',
    );
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

  it('never counts a special', () => {
    expect(
      decideListState({
        seasons: [...seasons, { numberOfAiredEpisodes: 3, seasonNumber: 0 }],
        skipped: [],
        watched: ['S00E01', 'S00E02', 'S00E03'],
      }),
    ).toBe('none');
  });
});
