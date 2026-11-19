import { describe, expect, it } from 'vitest';

import { isKnownEpisode, positionLabel, stepEpisode } from './episodeSteps';

// The Bear's shape: specials last, as `ShowSummary.seasons` sorts them
const SEASONS = [
  { episodeCount: 8, seasonNumber: 1 },
  { episodeCount: 10, seasonNumber: 2 },
  { episodeCount: 10, seasonNumber: 3 },
  { episodeCount: 3, seasonNumber: 0 },
];

const ref = (seasonNumber: number, episodeNumber: number) => ({
  episodeNumber,
  seasonNumber,
});

describe('stepEpisode', () => {
  it('steps within a season', () => {
    expect(stepEpisode(SEASONS, ref(3, 5), 1)).toEqual(ref(3, 6));
    expect(stepEpisode(SEASONS, ref(3, 5), -1)).toEqual(ref(3, 4));
  });

  it('crosses into the next and previous season', () => {
    expect(stepEpisode(SEASONS, ref(1, 8), 1)).toEqual(ref(2, 1));
    expect(stepEpisode(SEASONS, ref(2, 1), -1)).toEqual(ref(1, 8));
  });

  it('stops at the show’s first and last episode', () => {
    expect(stepEpisode(SEASONS, ref(1, 1), -1)).toBeNull();
    expect(stepEpisode(SEASONS, ref(3, 10), 1)).toBeNull();
  });

  it('keeps specials to themselves', () => {
    expect(stepEpisode(SEASONS, ref(0, 1), 1)).toEqual(ref(0, 2));
    expect(stepEpisode(SEASONS, ref(0, 1), -1)).toBeNull();
    expect(stepEpisode(SEASONS, ref(0, 3), 1)).toBeNull();
  });

  it('skips seasons without episodes and sorts by number', () => {
    const seasons = [
      { episodeCount: 2, seasonNumber: 3 },
      { episodeCount: 0, seasonNumber: 2 },
      { episodeCount: 4, seasonNumber: 1 },
    ];
    expect(stepEpisode(seasons, ref(1, 4), 1)).toEqual(ref(3, 1));
    expect(stepEpisode(seasons, ref(3, 1), -1)).toEqual(ref(1, 4));
  });

  it('gives up on a season the show doesn’t have', () => {
    expect(stepEpisode(SEASONS, ref(9, 1), 1)).toBeNull();
  });
});

describe('isKnownEpisode', () => {
  const seasons = [
    { airedEpisodeCount: 5, episodeCount: 5, seasonNumber: 1 },
    { airedEpisodeCount: 0, episodeCount: 8, seasonNumber: 2 },
  ];

  it('knows the seasons’ episodes, announced ones included', () => {
    expect(isKnownEpisode(seasons, { episodeNumber: 5, seasonNumber: 1 })).toBe(
      true,
    );
    expect(isKnownEpisode(seasons, { episodeNumber: 8, seasonNumber: 2 })).toBe(
      true,
    );
  });

  it('refuses a number past the season, a season the show lacks and 0', () => {
    expect(
      isKnownEpisode(seasons, { episodeNumber: 99, seasonNumber: 1 }),
    ).toBe(false);
    expect(isKnownEpisode(seasons, { episodeNumber: 1, seasonNumber: 7 })).toBe(
      false,
    );
    expect(isKnownEpisode(seasons, { episodeNumber: 0, seasonNumber: 1 })).toBe(
      false,
    );
  });
});

describe('positionLabel', () => {
  it('reads "Episode N of M"', () => {
    expect(positionLabel(SEASONS, ref(3, 5))).toBe('Episode 5 of 10');
  });

  it('drops the count when it is unknown', () => {
    expect(positionLabel(SEASONS, ref(9, 2))).toBe('Episode 2');
  });
});

describe('a show TMDB numbers on across seasons', () => {
  // S1 is E1…E32, S2 E33…E53, specials 1…3
  const seasons = [
    { airedEpisodeCount: 32, episodeCount: 32, seasonNumber: 1 },
    {
      airedEpisodeCount: 8,
      episodeCount: 21,
      firstEpisodeNumber: 33,
      seasonNumber: 2,
    },
    { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 0 },
  ];

  it('steps through the real numbers and across seasons', () => {
    expect(stepEpisode(seasons, ref(1, 32), 1)).toEqual(ref(2, 33));
    expect(stepEpisode(seasons, ref(2, 33), -1)).toEqual(ref(1, 32));
    expect(stepEpisode(seasons, ref(2, 33), 1)).toEqual(ref(2, 34));
    expect(stepEpisode(seasons, ref(2, 53), 1)).toBeNull();
  });

  it('knows the real numbers only', () => {
    expect(isKnownEpisode(seasons, ref(2, 33))).toBe(true);
    expect(isKnownEpisode(seasons, ref(2, 53))).toBe(true);
    expect(isKnownEpisode(seasons, ref(2, 1))).toBe(false);
    expect(isKnownEpisode(seasons, ref(2, 54))).toBe(false);
  });

  it('names the episode by its number, without a count it would contradict', () => {
    expect(positionLabel(seasons, ref(2, 33))).toBe('Episode 33');
    const long = [
      { episodeCount: 100, firstEpisodeNumber: 54, seasonNumber: 3 },
    ];
    expect(positionLabel(long, ref(3, 60))).toBe('Episode 60');
    expect(positionLabel(seasons, ref(1, 5))).toBe('Episode 5 of 32');
  });
});
