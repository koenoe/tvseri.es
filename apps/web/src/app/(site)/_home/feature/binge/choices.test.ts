import type { Feature, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { bingeChoices } from './choices';

type Binge = Extract<Feature, Readonly<{ kind: 'binge' }>>;

const series = (id: number, title: string, extra: Partial<TvSeries> = {}) =>
  ({
    id,
    posterImage: `/${id}.jpg`,
    slug: title.toLowerCase(),
    title,
    ...extra,
  }) as TvSeries;

const season = (seasonNumber: number, count: number) => ({
  airDate: '',
  description: '',
  episodes: [],
  hasAired: true,
  id: seasonNumber,
  numberOfAiredEpisodes: count,
  numberOfEpisodes: count,
  seasonNumber,
  title: '',
});

const binge = (extra: Partial<Binge>): Binge => ({
  episodeRuntime: 52,
  kind: 'binge',
  numberOfEpisodes: 26,
  series: series(1, 'Dark'),
  shows: [],
  totalMinutes: 1352,
  ...extra,
});

describe('bingeChoices', () => {
  it('maps the API shows to what the island needs', () => {
    const result = bingeChoices(
      binge({
        shows: [
          {
            episodeRuntime: 52,
            numberOfEpisodes: 26,
            seasons: [10, 8, 8],
            series: series(1, 'Dark'),
            totalMinutes: 1352,
          },
          {
            episodeRuntime: 27,
            numberOfEpisodes: 12,
            seasons: [6, 6],
            series: series(4, 'Fleabag'),
            totalMinutes: 324,
          },
        ],
      }),
    );
    expect(result).toEqual([
      {
        id: 1,
        poster: '/1.jpg',
        runtime: 52,
        seasons: [10, 8, 8],
        slug: 'dark',
        title: 'Dark',
      },
      {
        id: 4,
        poster: '/4.jpg',
        runtime: 27,
        seasons: [6, 6],
        slug: 'fleabag',
        title: 'Fleabag',
      },
    ]);
  });

  it('falls back to the day show and its own seasons', () => {
    const result = bingeChoices(
      binge({
        series: series(1, 'Dark', {
          seasons: [season(1, 10), season(2, 8), season(3, 8)],
        }),
        shows: undefined,
      } as unknown as Partial<Binge>),
    );
    expect(result.map((choice) => choice.seasons)).toEqual([[10, 8, 8]]);
  });

  it('falls back to one block of episodes without seasons', () => {
    expect(bingeChoices(binge({}))[0]?.seasons).toEqual([26]);
  });
});
