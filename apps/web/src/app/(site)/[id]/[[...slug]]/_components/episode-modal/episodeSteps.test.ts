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
