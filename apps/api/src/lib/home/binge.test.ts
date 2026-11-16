import type { Season, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { bingeShowOf, choicesFrom, episodesPerSeason } from './binge';

const season = (
  seasonNumber: number,
  numberOfEpisodes: number,
  numberOfAiredEpisodes = numberOfEpisodes,
): Season => ({
  airDate: '',
  description: '',
  episodes: [],
  hasAired: true,
  id: seasonNumber,
  numberOfAiredEpisodes,
  numberOfEpisodes,
  seasonNumber,
  title: `Season ${seasonNumber}`,
});

const show = (seasons: Season[]) =>
  ({ id: 1, seasons, title: 'Dark' }) as unknown as TvSeries;

describe('episodesPerSeason', () => {
  it('lists aired episodes per regular season, in order', () => {
    expect(
      episodesPerSeason(show([season(2, 8), season(1, 10), season(3, 8)])),
    ).toEqual([10, 8, 8]);
  });

  it('leaves out specials and seasons with nothing aired yet', () => {
    expect(
      episodesPerSeason(show([season(0, 4), season(1, 6), season(2, 8, 0)])),
    ).toEqual([6]);
  });

  it('counts only the aired part of a running season', () => {
    expect(episodesPerSeason(show([season(1, 6), season(2, 8, 3)]))).toEqual([
      6, 3,
    ]);
  });

  it('is empty without seasons', () => {
    expect(episodesPerSeason(show([]))).toEqual([]);
  });
});

describe('bingeShowOf', () => {
  it('sums the seasons and the minutes', () => {
    const result = bingeShowOf(
      show([season(1, 10), season(2, 8), season(3, 8)]),
      52,
    );
    expect(result).toMatchObject({
      episodeRuntime: 52,
      numberOfEpisodes: 26,
      seasons: [10, 8, 8],
      totalMinutes: 1352,
    });
  });

  it('is undefined when nothing has aired', () => {
    expect(bingeShowOf(show([season(1, 8, 0)]), 45)).toBeUndefined();
  });
});

describe('choicesFrom', () => {
  it('takes four from the start, wrapping around the pool', () => {
    expect(choicesFrom(['a', 'b', 'c', 'd', 'e'], 3)).toEqual([
      'd',
      'e',
      'a',
      'b',
    ]);
  });

  it('takes the whole pool when it is smaller', () => {
    expect(choicesFrom(['a', 'b'], 1)).toEqual(['b', 'a']);
    expect(choicesFrom([], 0)).toEqual([]);
  });
});
