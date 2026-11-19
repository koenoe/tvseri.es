import { describe, expect, it } from 'vitest';

import type { SeriesBase } from '@/lib/marking/types';

import { airedRefs, chipLabel, seasonChips, tally } from './chips';

const view = (overrides: Partial<SeriesBase> = {}): SeriesBase => ({
  prefs: null,
  seasons: [
    { airedEpisodeCount: 4, episodeCount: 4, seasonNumber: 1 },
    { airedEpisodeCount: 2, episodeCount: 5, seasonNumber: 2 },
  ],
  seriesId: 1,
  skipped: [],
  status: null,
  watched: {},
  ...overrides,
});

const at = { runtime: 30, watchedAt: 1 };

describe('seasonChips', () => {
  it('draws every announced episode, the not-aired ones as na', () => {
    const chips = seasonChips(view(), 2, null);
    expect(chips.map((chip) => chip.state)).toEqual(['', '', 'na', 'na', 'na']);
  });

  it('maps watched, no date, skipped and Next up', () => {
    const chips = seasonChips(
      view({
        skipped: ['S01E03'],
        watched: { S01E01: at, S01E02: { ...at, dateUnknown: true } },
      }),
      1,
      { episodeNumber: 4, seasonNumber: 1 },
    );
    expect(chips.map((chip) => chip.state)).toEqual(['w', 'nd', 'sk', 'nx']);
  });

  it('keeps a watched record past the aired count', () => {
    const chips = seasonChips(view({ watched: { S02E03: at } }), 2, null);
    expect(chips[2]?.state).toBe('w');
  });

  it('adds chips a record names beyond the announced count', () => {
    const chips = seasonChips(view({ watched: { S01E06: at } }), 1, null);
    expect(chips).toHaveLength(6);
    expect(chips[4]?.state).toBe('na');
  });
});

describe('seasonChips on a show TMDB numbers on across seasons', () => {
  // Naruto Shippuden: S1 is E1…E32, S2 E33…E53 (8 aired)
  const numberedOn = (overrides: Partial<SeriesBase> = {}) =>
    view({
      seasons: [
        { airedEpisodeCount: 32, episodeCount: 32, seasonNumber: 1 },
        {
          airedEpisodeCount: 8,
          episodeCount: 21,
          firstEpisodeNumber: 33,
          seasonNumber: 2,
        },
      ],
      ...overrides,
    });

  it('draws exactly the season’s real episodes, never a made-up code below them', () => {
    const plain = seasonChips(numberedOn(), 2, null);
    expect(plain.map((chip) => chipLabel(chip.ref))).toEqual(
      Array.from({ length: 21 }, (_, index) => `E${33 + index}`),
    );
    expect(plain.filter((chip) => chip.state === 'na')).toHaveLength(13);
    const madeUp = seasonChips(
      numberedOn({ skipped: ['S02E01'], watched: { S02E02: at, S02E33: at } }),
      2,
      null,
    );
    expect(madeUp).toHaveLength(21);
    expect(madeUp[0]?.state).toBe('w');
    expect(tally(madeUp)).toMatchObject({ aired: 8, watched: 1 });
  });

  it('marks the season’s first real episode Next up', () => {
    const chips = seasonChips(numberedOn(), 2, {
      episodeNumber: 33,
      seasonNumber: 2,
    });
    expect(chips[0]?.state).toBe('nx');
  });
});

describe('tally', () => {
  it('counts watched over aired, skipped as not watched', () => {
    const chips = seasonChips(
      view({ skipped: ['S01E02'], watched: { S01E01: at } }),
      1,
      null,
    );
    expect(tally(chips)).toEqual({
      aired: 4,
      percentage: 25,
      state: 'part',
      watched: 1,
    });
  });

  it('is complete only when every aired episode is watched', () => {
    const chips = seasonChips(
      view({ watched: { S02E01: at, S02E02: at } }),
      2,
      null,
    );
    expect(tally(chips).state).toBe('w');
    expect(tally(seasonChips(view(), 2, null)).state).toBe('');
  });

  // the done rule itself: packages/utils isDone
  it('is done once nothing aired is open, skips included', () => {
    const done = seasonChips(
      view({ skipped: ['S02E02'], watched: { S02E01: at } }),
      2,
      null,
    );
    expect(tally(done)).toMatchObject({ state: 'w', watched: 1 });
  });
});

describe('helpers', () => {
  it('lists aired refs and labels chips', () => {
    expect(airedRefs(seasonChips(view(), 2, null))).toHaveLength(2);
    // a season's date leaves its skipped episodes skipped
    expect(
      airedRefs(seasonChips(view({ skipped: ['S02E01'] }), 2, null)),
    ).toEqual([{ episodeNumber: 2, seasonNumber: 2 }]);
    expect(chipLabel({ episodeNumber: 5, seasonNumber: 2 })).toBe('E05');
  });
});
