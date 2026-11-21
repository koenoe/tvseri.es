import type { SeriesFacts } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchDiscoverTvSeries: vi.fn(),
  getSeriesFactsReport: vi.fn(),
}));

vi.mock('@/lib/db/cache', () => ({
  getCacheEntry: async () => undefined,
  getCacheItem: async () => undefined,
  setCacheItem: async () => undefined,
}));
vi.mock('@/lib/tmdb/discover', () => ({
  fetchDiscoverTvSeries: mocks.fetchDiscoverTvSeries,
}));
vi.mock('@/lib/tmdb/reference', () => ({
  fetchGenresForTvSeries: async () => [],
}));
vi.mock('@/lib/seriesFacts', () => ({
  getSeriesFactsReport: mocks.getSeriesFactsReport,
}));

import { fetchDurationTiles } from './index';

const facts = (id: number, overrides: Partial<SeriesFacts>): SeriesFacts => ({
  backdropPath: `/b${id}.jpg`,
  episodeRuntime: 50,
  firstAirDate: '2022-05-01',
  genreIds: [80],
  id,
  imdbId: null,
  lastAirDate: '2022-06-01',
  lastEpisodeToAir: null,
  networks: [],
  nextEpisodeToAir: null,
  numberOfEpisodes: 6,
  originalLanguage: 'en',
  originCountries: [],
  popularity: 1,
  posterPath: `/p${id}.jpg`,
  seasons: [{ airDate: '2022-05-01', episodeCount: 6, seasonNumber: 1 }],
  slug: `show-${id}`,
  status: 'Ended',
  title: `Show ${id}`,
  totalRuntime: 300,
  type: 'Miniseries',
  voteAverage: 8,
  voteCount: 1000,
  ...overrides,
});

describe('fetchDurationTiles', () => {
  beforeEach(() => {
    // Popular shows: long running series (none is a miniseries); a miniseries
    // is only among the miniseries query's own candidates (with_type 2)
    mocks.fetchDiscoverTvSeries.mockImplementation(
      async (query: { with_type?: string }) => ({
        items: query.with_type === '2' ? [{ id: 1 }, { id: 2 }] : [{ id: 10 }],
        totalNumberOfItems: 100,
        totalNumberOfPages: 5,
      }),
    );
    mocks.getSeriesFactsReport.mockImplementation(
      async (ids: ReadonlyArray<number>) => ({
        facts: new Map(
          ids.map((id) => [
            id,
            id >= 10
              ? facts(id, {
                  seasons: Array.from({ length: 6 }, (_, i) => ({
                    airDate: '2010-01-01',
                    episodeCount: 20,
                    seasonNumber: i + 1,
                  })),
                  status: 'Returning Series',
                  totalRuntime: 6000,
                  type: 'Scripted',
                })
              : facts(id, { voteAverage: id === 2 ? 9 : 7 }),
          ]),
        ),
        failed: new Set(),
      }),
    );
  });

  it('dresses Under 6 hours with miniseries even when none is among the most popular shows', async () => {
    const {
      value: { tiles },
    } = await fetchDurationTiles();
    const tile = tiles.find((entry) => entry.bucket === 'under-6-hours');

    expect(tile?.exact).toBe(true);
    expect(tile?.preview.map((show) => show.id)).toEqual([2, 1]);
  });
});

describe('fetchDurationTiles previews (never an empty tile)', () => {
  it('puts the shows with art first, so Under 6 hours has a backdrop when any of its shows has one', async () => {
    mocks.fetchDiscoverTvSeries.mockImplementation(
      async (query: { with_type?: string }) => ({
        items:
          query.with_type === '2'
            ? [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
            : [{ id: 10 }],
        totalNumberOfItems: 100,
        totalNumberOfPages: 5,
      }),
    );
    mocks.getSeriesFactsReport.mockImplementation(
      async (ids: ReadonlyArray<number>) => ({
        facts: new Map(
          ids.map((id) => [
            id,
            // the three best rated have no backdrop, the fourth has one
            facts(id, {
              backdropPath: id === 4 ? '/b4.jpg' : null,
              voteAverage: 10 - id,
            }),
          ]),
        ),
        failed: new Set(),
      }),
    );

    const {
      value: { tiles },
    } = await fetchDurationTiles();
    const tile = tiles.find((entry) => entry.bucket === 'under-6-hours');

    expect(tile?.preview[0]?.id).toBe(4);
    expect(tile?.preview[0]?.backdropImage).toContain('/b4.jpg');
    expect(tile?.preview).toHaveLength(3);
  });

  it('tops a tile up from its own shows when the popular sample has fewer than three', async () => {
    const oneSeason = (id: number) =>
      facts(id, {
        numberOfEpisodes: 8,
        seasons: [{ airDate: '2020-01-01', episodeCount: 8, seasonNumber: 1 }],
        status: 'Returning Series',
        totalRuntime: 2000,
        type: 'Scripted',
      });
    mocks.fetchDiscoverTvSeries.mockImplementation(
      async (query: { with_type?: string; sort_by?: string }) => ({
        items:
          query.with_type === '2|4'
            ? [{ id: 21 }, { id: 22 }, { id: 23 }]
            : [{ id: 20 }],
        totalNumberOfItems: 100,
        totalNumberOfPages: 5,
      }),
    );
    mocks.getSeriesFactsReport.mockImplementation(
      async (ids: ReadonlyArray<number>) => ({
        facts: new Map(ids.map((id) => [id, oneSeason(id)])),
        failed: new Set(),
      }),
    );

    const {
      value: { tiles },
    } = await fetchDurationTiles();
    const tile = tiles.find((entry) => entry.bucket === 'one-season');

    // the sample's one show, then the bucket's own first page
    expect(tile?.preview.map((show) => show.id)).toEqual([20, 21, 22]);
  });
});
