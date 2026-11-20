import { describe, expect, it } from 'vitest';

import { decadeKicker, decadeReason } from './reason';

const got = {
  episodes: 73,
  lastAirYear: 2019,
  over: true,
  rank: 1,
  seasons: 8,
  status: 'Ended',
};

describe('decadeKicker', () => {
  it('names the first, then the rank', () => {
    expect(decadeKicker(1)).toBe('Most rated of the decade');
    expect(decadeKicker(4)).toBe('Number 4 by attention');
  });
});

describe('decadeReason', () => {
  it('writes the design’s line for the most-rated show', () => {
    expect(decadeReason(got)).toBe(
      'The most-rated series of the decade on TMDB: eight seasons, finished in 2019.',
    );
  });

  it('gives the others their place', () => {
    expect(
      decadeReason({ ...got, lastAirYear: 2021, rank: 2, seasons: 3 }),
    ).toBe(
      'The second most-rated series of the decade on TMDB: three seasons, finished in 2021.',
    );
    expect(decadeReason({ ...got, rank: 13 })).toBe(
      'The number 13 most-rated series of the decade on TMDB: eight seasons, finished in 2019.',
    );
  });

  it('counts episodes for a one-season show and digits past twenty', () => {
    expect(decadeReason({ ...got, episodes: 5, rank: 8, seasons: 1 })).toBe(
      'The eighth most-rated series of the decade on TMDB: five episodes, finished in 2019.',
    );
    expect(decadeReason({ ...got, seasons: 22 })).toContain('22 seasons');
  });

  it('says a running show runs and leaves out what it doesn’t know', () => {
    expect(
      decadeReason({
        ...got,
        lastAirYear: 2025,
        over: false,
        status: 'Returning Series',
      }),
    ).toBe(
      'The most-rated series of the decade on TMDB: eight seasons, still running.',
    );
    expect(
      decadeReason({
        episodes: 0,
        lastAirYear: null,
        over: false,
        rank: 1,
        seasons: 0,
        status: null,
      }),
    ).toBe('The most-rated series of the decade on TMDB.');
    expect(decadeReason({ ...got, lastAirYear: null, status: 'Ended' })).toBe(
      'The most-rated series of the decade on TMDB: eight seasons.',
    );
  });

  it('says nothing of the end while a cancelled show still airs', () => {
    expect(
      decadeReason({
        ...got,
        lastAirYear: 2026,
        over: false,
        status: 'Canceled',
      }),
    ).toBe('The most-rated series of the decade on TMDB: eight seasons.');
  });
});
