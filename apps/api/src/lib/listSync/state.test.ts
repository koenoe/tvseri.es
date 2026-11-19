import { describe, expect, it } from 'vitest';

import { countDoneSkips, decideListState } from './state';

describe('decideListState', () => {
  it('is watched when every aired episode is watched', () => {
    expect(decideListState({ airedCount: 10, watchedCount: 10 })).toBe(
      'watched',
    );
  });

  it('stays watched when more are watched than TMDB says aired', () => {
    expect(decideListState({ airedCount: 10, watchedCount: 11 })).toBe(
      'watched',
    );
  });

  it('is in progress with some watched', () => {
    expect(decideListState({ airedCount: 10, watchedCount: 9 })).toBe(
      'in_progress',
    );
  });

  it('is none with nothing watched', () => {
    expect(decideListState({ airedCount: 10, watchedCount: 0 })).toBe('none');
  });

  it('is none when nothing has aired', () => {
    expect(decideListState({ airedCount: 0, watchedCount: 3 })).toBe('none');
  });

  it('is watched when the rest of the aired episodes are skipped', () => {
    expect(
      decideListState({ airedCount: 10, skippedCount: 2, watchedCount: 8 }),
    ).toBe('watched');
  });

  it('stays in progress while an aired episode is neither watched nor skipped', () => {
    expect(
      decideListState({ airedCount: 10, skippedCount: 1, watchedCount: 8 }),
    ).toBe('in_progress');
  });

  it('is none with only skips: something has to be watched', () => {
    expect(
      decideListState({ airedCount: 10, skippedCount: 10, watchedCount: 0 }),
    ).toBe('none');
  });
});

describe('countDoneSkips: which skips count towards finishing', () => {
  // Season 1: 4 aired; season 2: 2 of its episodes aired
  const seasons = [
    { numberOfAiredEpisodes: 4, seasonNumber: 1 },
    { numberOfAiredEpisodes: 2, seasonNumber: 2 },
  ];
  const watched = [
    { episodeNumber: 1, seasonNumber: 1 },
    { episodeNumber: 2, seasonNumber: 1 },
  ];

  it('counts skips of aired regular episodes', () => {
    expect(
      countDoneSkips({ seasons, skipped: ['S01E03', 'S02E02'], watched }),
    ).toBe(2);
  });

  it('never counts an episode that has not aired, or that TMDB does not list', () => {
    expect(
      countDoneSkips({
        seasons,
        skipped: ['S02E03', 'S03E01', 'S01E09'],
        watched,
      }),
    ).toBe(0);
  });

  it('counts by the real episode numbers where TMDB numbers on across seasons', () => {
    // Season 2 is E5…E8, 2 of them aired
    const numberedOn = [
      { numberOfAiredEpisodes: 4, seasonNumber: 1 },
      { firstEpisodeNumber: 5, numberOfAiredEpisodes: 2, seasonNumber: 2 },
    ];
    expect(
      countDoneSkips({
        seasons: numberedOn,
        skipped: ['S02E05', 'S02E06', 'S02E07', 'S02E01'],
        watched,
      }),
    ).toBe(2);
  });

  it('never counts a special', () => {
    expect(
      countDoneSkips({
        seasons: [...seasons, { numberOfAiredEpisodes: 3, seasonNumber: 0 }],
        skipped: ['S00E01'],
        watched,
      }),
    ).toBe(0);
  });

  it('counts an episode that is also watched once (as watched)', () => {
    expect(
      countDoneSkips({ seasons, skipped: ['S01E01', 'S01E04'], watched }),
    ).toBe(1);
  });

  it('counts a skip listed twice once', () => {
    expect(
      countDoneSkips({ seasons, skipped: ['S01E03', 'S01E03'], watched }),
    ).toBe(1);
  });

  it('counts nothing for a show it knows no seasons of', () => {
    expect(countDoneSkips({ skipped: ['S01E03'], watched })).toBe(0);
  });

  it('ignores a malformed code', () => {
    expect(countDoneSkips({ seasons, skipped: ['E3'], watched })).toBe(0);
  });
});
