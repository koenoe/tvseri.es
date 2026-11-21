import type { DurationBucket, SeriesFacts } from '@tvseri.es/schemas';
import { DURATION_BUCKETS } from '@tvseri.es/schemas';
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

import { BUCKETS } from './buckets';
import { fetchDurationList, LIST_MAX_PAGES, LIST_TARGET } from './index';

const season = (episodeCount: number, seasonNumber: number) => ({
  airDate: '2020-01-01',
  episodeCount,
  seasonNumber,
});

const base = (id: number): SeriesFacts => ({
  backdropPath: `/b${id}.jpg`,
  episodeRuntime: 50,
  firstAirDate: '2020-01-01',
  genreIds: [18],
  id,
  imdbId: null,
  lastAirDate: '2020-03-01',
  lastEpisodeToAir: null,
  networks: [],
  nextEpisodeToAir: null,
  numberOfEpisodes: 20,
  originalLanguage: 'en',
  originCountries: [],
  popularity: 1,
  posterPath: `/p${id}.jpg`,
  seasons: [season(10, 1), season(10, 2)],
  slug: `show-${id}`,
  status: 'Returning Series',
  title: `Show ${id}`,
  totalRuntime: 1000,
  type: 'Scripted',
  voteAverage: 7,
  voteCount: 500,
});

/** Per tile: facts that fit its rule, and facts that do not */
const RULES: Readonly<
  Record<
    DurationBucket,
    Readonly<{ fits: Partial<SeriesFacts>; misses: Partial<SeriesFacts> }>
  >
> = {
  // ended
  'complete-stories': {
    fits: { status: 'Ended' },
    misses: { status: 'Returning Series' },
  },
  // 5 seasons or more
  'long-haul': {
    fits: { seasons: [1, 2, 3, 4, 5].map((n) => season(10, n)) },
    misses: {},
  },
  // one season of 6 to 13 episodes
  'one-season': {
    fits: { numberOfEpisodes: 10, seasons: [season(10, 1)] },
    misses: { numberOfEpisodes: 20, seasons: [season(20, 1)] },
  },
  // ended, over 6 and at most 10 hours in all
  'one-weekend': {
    fits: { status: 'Ended', totalRuntime: 540 },
    misses: { status: 'Ended', totalRuntime: 900 },
  },
  // ended, at most 6 hours in all
  'under-6-hours': {
    fits: { status: 'Ended', totalRuntime: 300 },
    misses: { status: 'Ended', totalRuntime: 420 },
  },
};

/**
 * Discover answers 20 candidates a page (ids page×100…); `fitting(id)` says
 * which of them fit the tile
 */
const tmdb = (bucket: DurationBucket, fitting: (id: number) => boolean) => {
  mocks.fetchDiscoverTvSeries.mockImplementation(
    async (query: { page?: number }) => ({
      items: Array.from({ length: 20 }, (_, i) => ({
        id: (query.page ?? 1) * 100 + i,
      })),
      totalNumberOfItems: 1000,
      totalNumberOfPages: 50,
    }),
  );
  mocks.getSeriesFactsReport.mockImplementation(
    async (ids: ReadonlyArray<number>) => ({
      facts: new Map(
        ids.map((id) => [
          id,
          {
            ...base(id),
            ...(fitting(id) ? RULES[bucket].fits : RULES[bucket].misses),
          },
        ]),
      ),
      failed: new Set(),
    }),
  );
};

const queriesSent = () =>
  mocks.fetchDiscoverTvSeries.mock.calls.map(
    (call) => call[0] as Readonly<Record<string, unknown>>,
  );

const pagesRead = () => queriesSent().map((query) => query.page);

describe('fetchDurationList: each tile’s rule', () => {
  beforeEach(() => {
    mocks.fetchDiscoverTvSeries.mockReset();
    mocks.getSeriesFactsReport.mockReset();
  });

  for (const bucket of DURATION_BUCKETS) {
    it(`${bucket}: reads on until it holds ${LIST_TARGET} shows that fit`, async () => {
      // three in twenty candidates fit
      tmdb(bucket, (id) => id % 20 < 3);
      const { partial, value } = await fetchDurationList(bucket);

      expect(partial).toBe(false);
      expect(value).toHaveLength(LIST_TARGET);
      expect(new Set(value.map((show) => show.id)).size).toBe(LIST_TARGET);
      expect(pagesRead()).toEqual([1, 2, 3, 4, 5, 6, 7]);
      for (const show of value) {
        expect(show.id % 20).toBeLessThan(3);
      }
      // every page asked the tile's own discover query
      for (const query of queriesSent()) {
        expect(query).toMatchObject({ ...BUCKETS[bucket].query });
      }
    });
  }

  // The page cap is one rule for every tile
  it(`stops after ${LIST_MAX_PAGES} pages with what fits (the hub withholds a short list)`, async () => {
    tmdb('one-season', (id) => id === 305);
    const { value } = await fetchDurationList('one-season');

    expect(value.map((show) => show.id)).toEqual([305]);
    expect(pagesRead()).toHaveLength(LIST_MAX_PAGES);
  });
});
