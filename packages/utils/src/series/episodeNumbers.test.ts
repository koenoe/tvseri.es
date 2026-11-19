import { describe, expect, it } from 'vitest';

import {
  episodeNumbersOf,
  firstEpisodeNumbers,
  firstEpisodeOf,
  isSeasonPremiere,
} from './episodeNumbers';

// Naruto Shippuden on TMDB: numbered on across seasons (S2 = E33…E53)
const shippuden = [
  { episodeCount: 32, seasonNumber: 1 },
  { episodeCount: 21, seasonNumber: 2 },
  { episodeCount: 18, seasonNumber: 3 },
  { episodeCount: 17, seasonNumber: 4 },
  { episodeCount: 24, seasonNumber: 5 },
];

const normal = [
  { episodeCount: 10, seasonNumber: 1 },
  { episodeCount: 8, seasonNumber: 2 },
];

describe('firstEpisodeNumbers', () => {
  it('starts every season at 1 for a show numbered per season', () => {
    expect(
      firstEpisodeNumbers(normal, {
        last: { episodeNumber: 8, seasonNumber: 2 },
        next: null,
      }),
    ).toEqual({ 1: 1, 2: 1 });
  });

  it('numbers on across seasons when the last episode lies past its season count', () => {
    expect(
      firstEpisodeNumbers(shippuden, {
        last: { episodeNumber: 112, seasonNumber: 5 },
        next: null,
      }),
    ).toEqual({ 1: 1, 2: 33, 3: 54, 4: 72, 5: 89 });
  });

  it('detects it from the next episode too', () => {
    expect(
      firstEpisodeNumbers(shippuden, {
        last: { episodeNumber: 88, seasonNumber: 4 },
        next: { episodeNumber: 89, seasonNumber: 5 },
      }),
    ).toEqual({ 1: 1, 2: 33, 3: 54, 4: 72, 5: 89 });
  });

  it('falls back to 1 when the episodes TMDB names do not fit the counted ranges', () => {
    expect(
      firstEpisodeNumbers(shippuden, {
        last: { episodeNumber: 300, seasonNumber: 5 },
        next: null,
      }),
    ).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
  });

  it('reads a count that lags the episodes TMDB names as a normal show', () => {
    // S2 lists 8, but its E09 has aired: TMDB's count is behind, not on
    expect(
      firstEpisodeNumbers(
        [
          { episodeCount: 8, seasonNumber: 1 },
          { episodeCount: 8, seasonNumber: 2 },
        ],
        { last: { episodeNumber: 9, seasonNumber: 2 }, next: null },
      ),
    ).toEqual({ 1: 1, 2: 1 });
  });

  it('numbers on a running show whose running season count lags its next episode', () => {
    // S2 lists 21 (E33…E53) while E53 has aired and E54 is next
    expect(
      firstEpisodeNumbers(
        [
          { episodeCount: 32, seasonNumber: 1 },
          { episodeCount: 21, seasonNumber: 2 },
        ],
        {
          last: { episodeNumber: 53, seasonNumber: 2 },
          next: { episodeNumber: 54, seasonNumber: 2 },
        },
      ),
    ).toEqual({ 1: 1, 2: 33 });
  });

  it('allows the lag for a running season TMDB already lists a next, empty season after', () => {
    expect(
      firstEpisodeNumbers(
        [
          { episodeCount: 32, seasonNumber: 1 },
          { episodeCount: 20, seasonNumber: 2 },
          { episodeCount: 0, seasonNumber: 3 },
        ],
        { last: { episodeNumber: 53, seasonNumber: 2 }, next: null },
      ),
    ).toEqual({ 1: 1, 2: 33, 3: 53 });
  });

  it('never allows the lag inside an earlier season', () => {
    // S1 ends at E32: an S1E34 is no lag of the running season
    expect(
      firstEpisodeNumbers(
        [
          { episodeCount: 32, seasonNumber: 1 },
          { episodeCount: 21, seasonNumber: 2 },
        ],
        {
          last: { episodeNumber: 34, seasonNumber: 1 },
          next: { episodeNumber: 54, seasonNumber: 2 },
        },
      ),
    ).toEqual({ 1: 1, 2: 1 });
  });

  it('keeps a normal show with a lagging count normal, next episode included', () => {
    expect(
      firstEpisodeNumbers(
        [
          { episodeCount: 8, seasonNumber: 1 },
          { episodeCount: 8, seasonNumber: 2 },
        ],
        {
          last: { episodeNumber: 9, seasonNumber: 2 },
          next: { episodeNumber: 10, seasonNumber: 2 },
        },
      ),
    ).toEqual({ 1: 1, 2: 1 });
  });

  it('ignores specials and a missing last episode', () => {
    expect(
      firstEpisodeNumbers(normal, {
        last: { episodeNumber: 40, seasonNumber: 0 },
        next: null,
      }),
    ).toEqual({ 1: 1, 2: 1 });
    expect(firstEpisodeNumbers(normal, { last: null, next: null })).toEqual({
      1: 1,
      2: 1,
    });
  });
});

describe('firstEpisodeOf / episodeNumbersOf', () => {
  it('lists a season’s real episode numbers, from 1 without a first number', () => {
    expect(firstEpisodeOf({})).toBe(1);
    expect(episodeNumbersOf({}, 3)).toEqual([1, 2, 3]);
    expect(episodeNumbersOf({ firstEpisodeNumber: 33 }, 3)).toEqual([
      33, 34, 35,
    ]);
    expect(episodeNumbersOf({ firstEpisodeNumber: 33 }, 0)).toEqual([]);
  });
});

describe('isSeasonPremiere', () => {
  it('is the season’s first real episode', () => {
    const seasons = [
      { seasonNumber: 1 },
      { firstEpisodeNumber: 33, seasonNumber: 2 },
    ];
    expect(
      isSeasonPremiere({ episodeNumber: 1, seasonNumber: 1 }, seasons),
    ).toBe(true);
    expect(
      isSeasonPremiere({ episodeNumber: 33, seasonNumber: 2 }, seasons),
    ).toBe(true);
    expect(
      isSeasonPremiere({ episodeNumber: 1, seasonNumber: 2 }, seasons),
    ).toBe(false);
    // a season TMDB doesn't list yet starts at 1
    expect(
      isSeasonPremiere({ episodeNumber: 1, seasonNumber: 3 }, seasons),
    ).toBe(true);
  });
});
