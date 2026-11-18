import { describe, expect, it } from 'vitest';

import { firstSeasonAfter, seasonsOutlook } from './seasons';

const season = (seasonNumber: number, started: boolean) => ({
  seasonNumber,
  started,
});

describe('seasonsOutlook', () => {
  it('counts one season and S02 renewed when TMDB lists an unaired S2', () => {
    expect(
      seasonsOutlook('Returning Series', [season(1, true), season(2, false)]),
    ).toEqual({ airedSeasons: 1, renewedSeason: 2 });
  });

  it('guesses no season when nothing after the last aired one is listed', () => {
    expect(
      seasonsOutlook('Returning Series', [season(1, true), season(2, true)]),
    ).toEqual({ airedSeasons: 2, renewedSeason: null });
  });

  it('names a listed S3 after two aired seasons', () => {
    expect(
      seasonsOutlook('Returning Series', [
        season(1, true),
        season(2, true),
        season(3, false),
      ]),
    ).toEqual({ airedSeasons: 2, renewedSeason: 3 });
  });

  it('is never a renewal for a show that ended or was cancelled', () => {
    for (const status of ['Ended', 'Canceled']) {
      expect(
        seasonsOutlook(status, [season(1, true), season(2, false)]),
      ).toEqual({
        airedSeasons: 1,
        renewedSeason: null,
      });
    }
  });

  it('keeps the listed count for a show with nothing aired yet', () => {
    expect(seasonsOutlook('In Production', [season(1, false)])).toEqual({
      airedSeasons: 1,
      renewedSeason: null,
    });
    expect(seasonsOutlook('Returning Series', [season(1, false)])).toEqual({
      airedSeasons: 1,
      renewedSeason: null,
    });
  });

  it('is nothing without seasons', () => {
    expect(seasonsOutlook('Returning Series', [])).toEqual({
      airedSeasons: 0,
      renewedSeason: null,
    });
  });
});

describe('firstSeasonAfter', () => {
  it('is the lowest listed season above the given one, in any order', () => {
    expect(firstSeasonAfter([4, 1, 3, 2], 2)).toBe(3);
  });

  it('is null when none is listed above it', () => {
    expect(firstSeasonAfter([1, 2], 2)).toBeNull();
  });
});
