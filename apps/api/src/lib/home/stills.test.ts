import type { EpisodeStill } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { pickSeasonStills } from './stills';

const still = (overrides: Partial<EpisodeStill> = {}): EpisodeStill => ({
  aspectRatio: 1.778,
  height: 1080,
  path: '/a.jpg',
  voteAverage: 6,
  voteCount: 3,
  width: 1920,
  ...overrides,
});

const season = (count: number, overrides: Partial<EpisodeStill> = {}) =>
  Array.from({ length: count }, (_, i) => ({
    episodeNumber: i + 1,
    stills: [still({ path: `/e${i + 1}.jpg`, ...overrides })],
  }));

describe('pickSeasonStills', () => {
  it('needs six episodes with a qualifying still', () => {
    expect(pickSeasonStills(season(5))).toBeUndefined();
    expect(pickSeasonStills(season(6))?.map((s) => s.episodeNumber)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it.each([
    ['too small', { height: 719, width: 1279 }],
    ['not 16:9', { aspectRatio: 1.5 }],
    ['too few votes', { voteCount: 1 }],
    ['voted too low', { voteAverage: 5.1 }],
  ])('rejects a still that is %s', (_name, overrides) => {
    expect(pickSeasonStills(season(8, overrides))).toBeUndefined();
  });

  it('takes every qualifying episode of a short season, in episode order', () => {
    expect(pickSeasonStills(season(8))?.map((s) => s.episodeNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it('takes the twelve best voted episodes of a long one, in episode order, one still each', () => {
    const episodes = season(14);
    episodes[0] = {
      episodeNumber: 1,
      stills: [
        still({ path: '/low.jpg', voteAverage: 5.3 }),
        still({ path: '/high.jpg', voteAverage: 9 }),
      ],
    };
    episodes[1] = { episodeNumber: 2, stills: [still({ voteAverage: 5.3 })] };
    episodes[2] = { episodeNumber: 3, stills: [still({ voteAverage: 5.4 })] };

    const picked = pickSeasonStills(episodes);

    expect(picked?.map((s) => s.episodeNumber)).toEqual([
      1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(picked?.[0]?.still.path).toBe('/high.jpg');
  });
});
