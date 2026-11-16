import type { SeriesFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { BUCKETS, bucketQuery, toDurationShow, whyLine } from './buckets';

const facts = (overrides: Partial<SeriesFacts> = {}): SeriesFacts => ({
  backdropPath: '/b.jpg',
  episodeRuntime: 50,
  firstAirDate: '2022-05-01',
  genreIds: [80],
  id: 1,
  imdbId: null,
  lastAirDate: '2022-06-01',
  lastEpisodeToAir: null,
  networks: [],
  nextEpisodeToAir: null,
  numberOfEpisodes: 6,
  originalLanguage: 'en',
  originCountries: [],
  popularity: 1,
  posterPath: '/p.jpg',
  seasons: [{ airDate: '2022-05-01', episodeCount: 6, seasonNumber: 1 }],
  slug: 'show',
  status: 'Ended',
  title: 'Show',
  totalRuntime: 300,
  type: 'Miniseries',
  voteAverage: 8,
  voteCount: 1000,
  ...overrides,
});

describe('duration buckets', () => {
  it('Under 6 hours is ended with 6 hours or less in all', () => {
    const includes = BUCKETS['under-6-hours'].includes;

    expect(includes(facts({ totalRuntime: 360 }))).toBe(true);
    expect(includes(facts({ totalRuntime: 361 }))).toBe(false);
    expect(includes(facts({ status: 'Returning Series' }))).toBe(false);
    expect(includes(facts({ totalRuntime: null }))).toBe(false);
  });

  it('One weekend is ended, over 6 hours and 10 at most: never a show Under 6 hours lists', () => {
    const includes = BUCKETS['one-weekend'].includes;

    expect(includes(facts({ totalRuntime: 600 }))).toBe(true);
    expect(includes(facts({ totalRuntime: 601 }))).toBe(false);
    expect(includes(facts({ totalRuntime: 361 }))).toBe(true);
    expect(includes(facts({ totalRuntime: 360 }))).toBe(false);
    expect(includes(facts({ totalRuntime: null }))).toBe(false);
  });

  it('One season asks TMDB for shows of the last three years only', () => {
    expect(bucketQuery('one-season', '2026-11-14')).toMatchObject({
      'first_air_date.gte': '2023-11-14',
    });
    expect(bucketQuery('one-weekend', '2026-11-14')).not.toHaveProperty(
      'first_air_date.gte',
    );
  });

  it('One season is a single season of 6 to 13 episodes, ended or not', () => {
    const includes = BUCKETS['one-season'].includes;

    expect(includes(facts({ status: 'Returning Series' }))).toBe(true);
    expect(includes(facts({ numberOfEpisodes: 14 }))).toBe(false);
    expect(includes(facts({ numberOfEpisodes: 5 }))).toBe(false);
    expect(
      includes(
        facts({
          seasons: [
            { airDate: '', episodeCount: 5, seasonNumber: 1 },
            { airDate: '', episodeCount: 5, seasonNumber: 2 },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('The long haul is 5 seasons or more', () => {
    const seasons = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        airDate: '',
        episodeCount: 10,
        seasonNumber: i + 1,
      }));

    expect(BUCKETS['long-haul'].includes(facts({ seasons: seasons(5) }))).toBe(
      true,
    );
    expect(BUCKETS['long-haul'].includes(facts({ seasons: seasons(4) }))).toBe(
      false,
    );
  });

  it('Complete stories are ended or cancelled', () => {
    const includes = BUCKETS['complete-stories'].includes;

    expect(includes(facts({ status: 'Canceled' }))).toBe(true);
    expect(includes(facts({ status: 'In Production' }))).toBe(false);
  });
});

describe('toDurationShow and whyLine', () => {
  it('maps what the tiles draw', () => {
    expect(
      toDurationShow(facts({ title: 'Adolescence', totalRuntime: 250 })),
    ).toMatchObject({
      numberOfEpisodes: 6,
      numberOfSeasons: 1,
      title: 'Adolescence',
      totalMinutes: 250,
      year: 2022,
    });
  });

  it('carries the first listed network, or none', () => {
    const listed = [
      { id: 49, name: 'HBO' },
      { id: 213, name: 'Netflix' },
    ];

    expect(toDurationShow(facts({ networks: listed })).network).toEqual({
      id: 49,
      name: 'HBO',
    });
    expect(toDurationShow(facts()).network).toBeNull();
  });

  it('writes the favourite line with the country', () => {
    const show = toDurationShow(facts({ totalRuntime: 250 }));
    const korea = { kind: 'country', name: 'South Korea' } as const;

    expect(whyLine('favourite', { ...show, numberOfSeasons: 1 }, korea)).toBe(
      '1 season, and the most-voted series from South Korea on TMDB',
    );
    expect(whyLine('favourite', { ...show, numberOfSeasons: 3 }, korea)).toBe(
      '3 seasons, and the most-voted series from South Korea on TMDB',
    );
  });

  it('names the long haul’s pool on every landing kind (never a bare "show")', () => {
    const show = { ...toDurationShow(facts({})), numberOfSeasons: 5 };

    expect(whyLine('long-haul', show, { kind: 'genre', name: 'Crime' })).toBe(
      '5 seasons, and the most-voted long-running Crime series on TMDB',
    );
    expect(
      whyLine('long-haul', show, { kind: 'country', name: 'Denmark' }),
    ).toBe(
      '5 seasons, and the most-voted long-running series from Denmark on TMDB',
    );
    expect(whyLine('long-haul', show, { kind: 'theme' })).toBe(
      '5 seasons, and the most-voted long-running series with this theme on TMDB',
    );
    expect(
      whyLine('long-haul', show, { kind: 'country', name: 'Denmark' }, false),
    ).toBe(
      '5 seasons, among the most-voted long-running series from Denmark on TMDB',
    );
  });

  it('writes a line from the numbers', () => {
    const show = toDurationShow(
      facts({ numberOfEpisodes: 4, totalRuntime: 250 }),
    );

    expect(whyLine('night', show, { kind: 'theme' })).toBe(
      '4 episodes, 4h 10m in all',
    );
  });
});
