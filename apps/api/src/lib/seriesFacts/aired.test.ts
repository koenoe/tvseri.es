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
});

// Three seasons of 12, all aired by 2024
const threeSeasons = {
  numberOfEpisodes: 36,
  seasons: [
    { airDate: '2013-09-12', episodeCount: 12, seasonNumber: 1 },
    { airDate: '2014-10-02', episodeCount: 12, seasonNumber: 2 },
    { airDate: '2016-05-05', episodeCount: 12, seasonNumber: 3 },
  ],
} as const;
const LATER = Date.parse('2024-01-01');

describe('airedEpisodesAt never counts fewer than the seasons prove (the 12 of 36 bug)', () => {
  it('counts an ended show whose last aired episode is a special', () => {
    const special = {
      airDate: '2023-12-24',
      episodeNumber: 3,
      runtime: 60,
      seasonNumber: 0,
    };
    expect(
      airedEpisodesAt(
        facts({
          ...threeSeasons,
          lastEpisodeToAir: special,
          nextEpisodeToAir: null,
          status: 'Ended',
        }),
        LATER,
      ).total,
    ).toBe(36);
  });

  it('counts an ended show without a last aired episode', () => {
    expect(
      airedEpisodesAt(
        facts({
          ...threeSeasons,
          lastEpisodeToAir: null,
          nextEpisodeToAir: null,
          status: 'Ended',
        }),
        LATER,
      ).total,
    ).toBe(36);
  });

  it('counts every season before one that has started, whatever the last aired episode says', () => {
    const stale = {
      airDate: '2013-12-01',
      episodeNumber: 12,
      runtime: 60,
      seasonNumber: 1,
    };
    expect(
      airedEpisodesAt(
        facts({
          ...threeSeasons,
          lastEpisodeToAir: stale,
          nextEpisodeToAir: null,
          status: 'Returning Series',
        }),
        LATER,
      ).bySeason,
    ).toEqual({ 1: 12, 2: 12, 3: 0 });
  });

  it('leaves a returning show mid-season as TMDB says', () => {
    const last = {
      airDate: '2016-06-02',
      episodeNumber: 5,
      runtime: 60,
      seasonNumber: 3,
    };
    expect(
      airedEpisodesAt(
        facts({
          ...threeSeasons,
          lastEpisodeToAir: last,
          nextEpisodeToAir: null,
          status: 'Returning Series',
        }),
        Date.parse('2016-06-03'),
      ).total,
    ).toBe(29);
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
        LATER,
      ).total,
    ).toBe(0);
  });
});
