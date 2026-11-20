import { describe, expect, it } from 'vitest';

import { hasAiredAt, isSeasonFullyAired } from './aired';

describe('hasAiredAt: an episode counts as aired from the start of its UTC air day', () => {
  const day = '2026-11-19';
  const midnight = Date.parse('2026-11-19T00:00:00Z');

  it('is aired from midnight UTC of its air date', () => {
    expect(hasAiredAt(day, midnight)).toBe(true);
    expect(hasAiredAt(day, midnight + 60_000)).toBe(true);
  });

  it('is not aired the moment before', () => {
    expect(hasAiredAt(day, midnight - 1)).toBe(false);
  });

  it('reads the API’s ISO air dates by their day', () => {
    expect(hasAiredAt('2026-11-19T00:00:00.000Z', midnight)).toBe(true);
    expect(hasAiredAt('2026-11-19T00:00:00.000Z', midnight - 1)).toBe(false);
  });

  it('never counts an episode without a date', () => {
    expect(hasAiredAt('', midnight)).toBe(false);
    expect(hasAiredAt(null, midnight)).toBe(false);
    expect(hasAiredAt(undefined, midnight)).toBe(false);
    expect(hasAiredAt('not a date', midnight)).toBe(false);
  });
});

describe('isSeasonFullyAired: every counted episode out and none of the season still to come', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const season = { episodeCount: 8, seasonNumber: 2 };

  it('is fully aired when its count has aired and the next episode is another season’s', () => {
    expect(
      isSeasonFullyAired({ ...season, airedCount: 8, next: null }, now),
    ).toBe(true);
    expect(
      isSeasonFullyAired(
        {
          ...season,
          airedCount: 8,
          next: { airDate: '2027-01-10', episodeNumber: 1, seasonNumber: 3 },
        },
        now,
      ),
    ).toBe(true);
  });

  it('is still airing while fewer than its count have aired', () => {
    expect(
      isSeasonFullyAired({ ...season, airedCount: 7, next: null }, now),
    ).toBe(false);
  });

  it('is still airing when TMDB’s count trails and its next episode is yet to air', () => {
    // S2 lists 8 episodes, 8 aired, E09 next week: the count is behind
    expect(
      isSeasonFullyAired(
        {
          ...season,
          airedCount: 8,
          next: { airDate: '2026-11-27', episodeNumber: 9, seasonNumber: 2 },
        },
        now,
      ),
    ).toBe(false);
  });

  it('is still airing when an episode past its count has aired', () => {
    expect(
      isSeasonFullyAired(
        {
          ...season,
          airedCount: 8,
          next: { airDate: '2026-11-20', episodeNumber: 9, seasonNumber: 2 },
        },
        now,
      ),
    ).toBe(false);
  });

  it('is fully aired on its finale’s day, while TMDB still lists the finale as next', () => {
    expect(
      isSeasonFullyAired(
        {
          ...season,
          airedCount: 8,
          next: { airDate: '2026-11-20', episodeNumber: 8, seasonNumber: 2 },
        },
        now,
      ),
    ).toBe(true);
  });

  it('reads the finale by the season’s own numbers when TMDB numbers on', () => {
    // S2 runs E33…E40
    const numberedOn = { ...season, airedCount: 8, firstEpisodeNumber: 33 };
    expect(
      isSeasonFullyAired(
        {
          ...numberedOn,
          next: { airDate: '2026-11-20', episodeNumber: 40, seasonNumber: 2 },
        },
        now,
      ),
    ).toBe(true);
    expect(
      isSeasonFullyAired(
        {
          ...numberedOn,
          next: { airDate: '2026-11-27', episodeNumber: 41, seasonNumber: 2 },
        },
        now,
      ),
    ).toBe(false);
  });

  it('is never fully aired without a count', () => {
    expect(
      isSeasonFullyAired(
        { airedCount: 0, episodeCount: 0, next: null, seasonNumber: 2 },
        now,
      ),
    ).toBe(false);
  });
});
