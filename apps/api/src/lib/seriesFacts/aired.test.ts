import type { SeriesFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { airedEpisodesAt } from './aired';

const facts = (overrides: Partial<SeriesFacts> = {}): SeriesFacts => ({
  backdropPath: null,
  episodeRuntime: 50,
  firstAirDate: '2020-01-01',
  genreIds: [18],
  id: 1,
  imdbId: null,
  lastAirDate: '2025-01-08',
  lastEpisodeToAir: {
    airDate: '2025-01-08',
    episodeNumber: 2,
    runtime: 50,
    seasonNumber: 2,
  },
  networks: [],
  nextEpisodeToAir: {
    airDate: '2025-01-15',
    episodeNumber: 3,
    runtime: 50,
    seasonNumber: 2,
  },
  numberOfEpisodes: 18,
  originalLanguage: 'en',
  originCountries: ['GB'],
  popularity: 1,
  posterPath: null,
  seasons: [
    { airDate: '2020-01-01', episodeCount: 8, seasonNumber: 1 },
    { airDate: '2025-01-01', episodeCount: 10, seasonNumber: 2 },
  ],
  slug: 'show',
  status: 'Returning Series',
  title: 'Show',
  totalRuntime: 900,
  type: 'Scripted',
  voteAverage: 8,
  voteCount: 100,
  ...overrides,
});

describe('airedEpisodesAt', () => {
  it('counts every earlier season and the last aired episode of the current one', () => {
    expect(airedEpisodesAt(facts(), Date.parse('2025-01-10'))).toEqual({
      bySeason: { 1: 8, 2: 2 },
      total: 10,
    });
  });

  it('adds the next episode once its air date has passed', () => {
    expect(airedEpisodesAt(facts(), Date.parse('2025-01-16'))).toEqual({
      bySeason: { 1: 8, 2: 3 },
      total: 11,
    });
  });

  it('counts a fully aired show', () => {
    expect(
      airedEpisodesAt(
        facts({
          lastEpisodeToAir: {
            airDate: '2025-03-01',
            episodeNumber: 10,
            runtime: 50,
            seasonNumber: 2,
          },
          nextEpisodeToAir: null,
        }),
        Date.parse('2026-01-01'),
      ),
    ).toEqual({ bySeason: { 1: 8, 2: 10 }, total: 18 });
  });

  it('counts nothing before the first episode', () => {
    expect(
      airedEpisodesAt(
        facts({ lastEpisodeToAir: null, nextEpisodeToAir: null }),
        Date.parse('2019-01-01'),
      ),
    ).toEqual({ bySeason: { 1: 0, 2: 0 }, total: 0 });
  });

  it('never counts a season without an air date, ended or not', () => {
    expect(
      airedEpisodesAt(
        facts({
          lastEpisodeToAir: null,
          nextEpisodeToAir: null,
          seasons: [{ airDate: '', episodeCount: 8, seasonNumber: 1 }],
          status: 'Ended',
        }),
        Date.parse('2024-01-01'),
      ).total,
    ).toBe(0);
  });
});
