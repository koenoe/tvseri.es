import type { SeriesFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { airedEpisodesAt, seasonsOutlookAt } from './aired';

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

describe('seasonsOutlookAt', () => {
  const ONE_SEASON_AIRED = facts({
    lastEpisodeToAir: {
      airDate: '2025-11-11',
      episodeNumber: 8,
      runtime: 30,
      seasonNumber: 1,
    },
    nextEpisodeToAir: null,
    seasons: [
      { airDate: '2025-09-30', episodeCount: 8, seasonNumber: 1 },
      { airDate: '2026-12-01', episodeCount: 8, seasonNumber: 2 },
    ],
  });

  it('counts the aired season and names the listed unaired one', () => {
    expect(
      seasonsOutlookAt(ONE_SEASON_AIRED, Date.parse('2026-11-18')),
    ).toEqual({ airedSeasons: 1, renewedSeason: 2 });
  });

  it('is no renewal once that season has started airing', () => {
    expect(
      seasonsOutlookAt(
        {
          ...ONE_SEASON_AIRED,
          nextEpisodeToAir: {
            airDate: '2026-12-01',
            episodeNumber: 1,
            runtime: 30,
            seasonNumber: 2,
          },
        },
        Date.parse('2026-12-02'),
      ),
    ).toEqual({ airedSeasons: 2, renewedSeason: null });
  });

  it('reads a special as the last aired episode by the seasons, not as season 0', () => {
    expect(
      seasonsOutlookAt(
        facts({
          lastEpisodeToAir: {
            airDate: '2025-12-24',
            episodeNumber: 1,
            runtime: 60,
            seasonNumber: 0,
          },
          nextEpisodeToAir: null,
          seasons: [
            { airDate: '2020-01-01', episodeCount: 8, seasonNumber: 1 },
            { airDate: '2025-01-01', episodeCount: 10, seasonNumber: 2 },
            { airDate: '', episodeCount: 6, seasonNumber: 3 },
          ],
        }),
        Date.parse('2026-01-01'),
      ),
    ).toEqual({ airedSeasons: 2, renewedSeason: 3 });
  });
});

// Naruto Shippuden: TMDB numbers the episodes on across seasons
describe('airedEpisodesAt: episodes numbered on across seasons', () => {
  const numberedOn = facts({
    lastEpisodeToAir: {
      airDate: '2025-01-08',
      episodeNumber: 35,
      runtime: 24,
      seasonNumber: 2,
    },
    nextEpisodeToAir: {
      airDate: '2025-01-15',
      episodeNumber: 36,
      runtime: 24,
      seasonNumber: 2,
    },
    seasons: [
      { airDate: '2020-01-01', episodeCount: 32, seasonNumber: 1 },
      {
        airDate: '2025-01-01',
        episodeCount: 21,
        firstEpisodeNumber: 33,
        seasonNumber: 2,
      },
    ],
  });

  it('counts the current season from its first episode number', () => {
    expect(airedEpisodesAt(numberedOn, Date.parse('2025-01-10'))).toEqual({
      bySeason: { 1: 32, 2: 3 },
      total: 35,
    });
  });

  it('adds the next episode once its air date has passed', () => {
    expect(airedEpisodesAt(numberedOn, Date.parse('2025-01-16'))).toEqual({
      bySeason: { 1: 32, 2: 4 },
      total: 36,
    });
  });
});
