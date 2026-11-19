import type { SeriesFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { sharedShowFacts } from './sharedShow';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const day = (offset: number) =>
  new Date(NOW + offset * 86_400_000).toISOString().slice(0, 10);

const ep = (season: number, episode: number, airDate: string) => ({
  airDate,
  episodeNumber: episode,
  runtime: 24,
  seasonNumber: season,
});

// Naruto Shippuden: TMDB numbers on across seasons (S2 = E9…E16 here)
const facts = (overrides: Partial<SeriesFacts>): SeriesFacts => ({
  backdropPath: null,
  episodeRuntime: 24,
  firstAirDate: '2020-01-01',
  genreIds: [],
  id: 31910,
  imdbId: null,
  lastAirDate: day(-1),
  lastEpisodeToAir: ep(2, 16, day(-1)),
  networks: [],
  nextEpisodeToAir: null,
  numberOfEpisodes: 24,
  originalLanguage: 'ja',
  originCountries: [],
  popularity: 1,
  posterPath: null,
  seasons: [
    { airDate: '2020-01-01', episodeCount: 8, seasonNumber: 1 },
    {
      airDate: day(-50),
      episodeCount: 8,
      firstEpisodeNumber: 9,
      seasonNumber: 2,
    },
    { airDate: '', episodeCount: 8, firstEpisodeNumber: 17, seasonNumber: 3 },
  ],
  slug: 'naruto-shippuden',
  status: 'Returning Series',
  title: 'Naruto Shippuden',
  totalRuntime: null,
  type: null,
  voteAverage: 0,
  voteCount: 0,
  ...overrides,
});

describe('sharedShowFacts: episodes numbered on across seasons', () => {
  it('says the season is out when its last episode just aired', () => {
    expect(sharedShowFacts(facts({}), NOW)).toEqual({
      lastAiredSeason: 2,
      next: { kind: 'season-out', season: 2 },
    });
  });

  it('reads the next season’s first episode as its premiere', () => {
    expect(
      sharedShowFacts(facts({ nextEpisodeToAir: ep(3, 17, day(5)) }), NOW).next,
    ).toEqual({ date: day(5), kind: 'season-premiere', season: 3 });
  });
});
