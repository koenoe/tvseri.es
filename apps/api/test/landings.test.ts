import {
  allOf,
  excluding,
  keywordLanding,
  LANDING_SLUGS,
  LANDING_TYPES,
  landingFilter,
  landingPathFromDiscoverQuery,
  landingSlugForId,
  NETWORKS,
  THEME_GROUPS,
  themeBySlug,
} from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { onTmdb } from './fakeHttp';
import { request } from './request';

describe('slugs to discover filters', () => {
  it('maps a genre slug to its TMDB genre id', () => {
    expect(landingFilter('genre', 'crime')).toEqual({ with_genres: '80' });
    expect(landingFilter('genre', 'sci-fi-fantasy')).toEqual({
      with_genres: '10765',
    });
  });

  it('maps a theme slug to its keyword set, joined with | (any of them)', () => {
    expect(landingFilter('theme', 'time-travel')).toEqual({
      with_keywords: '4379|5455|10854',
    });
    expect(landingFilter('theme', 'dystopia')).toEqual({
      with_keywords: '4565|12190|178712',
    });
    expect(landingFilter('theme', 'serial-killers')).toEqual({
      with_keywords: '10714',
    });
  });

  it('adds the genre a genre-bound theme requires', () => {
    expect(landingFilter('theme', 'medical-dramas')).toEqual({
      with_genres: '18',
      with_keywords: '208788|11612',
    });
    expect(landingFilter('theme', 'workplace-comedies')).toEqual({
      with_genres: '35',
      with_keywords: '210605|6282|1438',
    });
    expect(landingFilter('theme', 'epic-fantasy')).toEqual({
      with_genres: '10765',
      with_keywords: '170362|161257|234213',
    });
  });

  it('has no landing for a retired theme slug', () => {
    for (const slug of [
      'heist',
      'prison',
      'cold-war',
      'detective',
      'serial-killer',
      'romance',
      'anime',
      'based-on-true-story',
    ]) {
      expect(landingFilter('theme', slug)).toBeUndefined();
    }
  });

  it('maps Horror, Thriller and Romance to their keyword, as genres', () => {
    expect(landingFilter('genre', 'horror')).toEqual({
      with_keywords: '315058',
    });
    expect(landingFilter('genre', 'thriller')).toEqual({
      with_keywords: '316362',
    });
    expect(landingFilter('genre', 'romance')).toEqual({
      with_keywords: '9840',
    });
    expect(LANDING_SLUGS.genre).toEqual(
      expect.arrayContaining(['horror', 'thriller', 'romance', 'crime']),
    );
    expect(LANDING_SLUGS.genre).toHaveLength(19);
  });

  it('maps a network slug to its TMDB network id', () => {
    expect(landingFilter('network', 'hbo')).toEqual({ with_networks: '49' });
    expect(landingFilter('network', 'apple-tv')).toEqual({
      with_networks: '2552',
    });
    expect(landingFilter('network', 'netflix')).toEqual({
      with_networks: '213',
    });
  });

  it('maps a country code (any case) to the upper-case origin country', () => {
    expect(landingFilter('country', 'gb')).toEqual({
      with_origin_country: 'GB',
    });
    expect(landingFilter('country', 'KR')).toEqual({
      with_origin_country: 'KR',
    });
  });

  it('maps a language code to the original language', () => {
    expect(landingFilter('language', 'ja')).toEqual({
      with_original_language: 'ja',
    });
  });

  it('maps a decade slug to its first-air-date window', () => {
    expect(landingFilter('decade', '2010s')).toEqual({
      'first_air_date.gte': '2010-01-01',
      'first_air_date.lte': '2019-12-31',
    });
  });

  it('knows nothing about unknown slugs', () => {
    expect(landingFilter('genre', 'not-a-genre')).toBeUndefined();
    expect(landingFilter('theme', 'not-a-theme')).toBeUndefined();
    expect(landingFilter('network', 'not-a-network')).toBeUndefined();
    expect(landingFilter('country', 'zz')).toBeUndefined();
    expect(landingFilter('country', 'gbr')).toBeUndefined();
    expect(landingFilter('language', 'zz')).toBeUndefined();
    expect(landingFilter('decade', '2015s')).toBeUndefined();
    expect(landingFilter('decade', '2010')).toBeUndefined();
    expect(landingFilter('decade', '2030s')).toBeUndefined();
  });

  it.each([
    'constructor',
    '__proto__',
    'toString',
    'hasOwnProperty',
    'valueOf',
  ])('knows nothing about the object key %s', (key) => {
    for (const type of LANDING_TYPES) {
      expect(landingFilter(type, key)).toBeUndefined();
    }
  });

  it('finds the slug of a genre, theme or network id, and nothing else', () => {
    expect(landingSlugForId('genre', 80)).toBe('crime');
    expect(landingSlugForId('theme', 4565)).toBe('dystopia');
    // any keyword of a theme's set leads to it
    expect(landingSlugForId('theme', 10854)).toBe('time-travel');
    expect(landingSlugForId('theme', 12190)).toBe('dystopia');
    expect(landingSlugForId('theme', 11612)).toBe('medical-dramas');
    // a genre's keyword is not a theme, and genre ids are TMDB's genres
    expect(landingSlugForId('theme', 315058)).toBeUndefined();
    expect(landingSlugForId('genre', 315058)).toBeUndefined();
    expect(landingSlugForId('network', 49)).toBe('hbo');
    expect(landingSlugForId('genre', 4565)).toBeUndefined();
    expect(landingSlugForId('theme', 80)).toBeUndefined();
    expect(landingSlugForId('genre', Number.NaN)).toBeUndefined();
  });

  it('has one factual line per network, and no duplicate slugs or ids', () => {
    expect(new Set(NETWORKS.map((n) => n.slug)).size).toBe(NETWORKS.length);
    expect(new Set(NETWORKS.map((n) => n.id)).size).toBe(NETWORKS.length);
    for (const network of NETWORKS) {
      expect(network.description).toMatch(/^[A-Z0-9].*\.$/);
      expect(network.description).not.toContain('\n');
    }
  });
});

describe('the theme list', () => {
  it('has 48 themes in six groups', () => {
    expect(LANDING_SLUGS.theme).toHaveLength(48);
    expect(THEME_GROUPS.map((group) => group.id)).toEqual([
      'hooks',
      'people',
      'creatures',
      'setting',
      'subjects',
      'subgenres',
    ]);
    const perGroup = Object.fromEntries(
      THEME_GROUPS.map((group) => [
        group.id,
        LANDING_SLUGS.theme.filter(
          (slug) => themeBySlug(slug)?.group === group.id,
        ).length,
      ]),
    );
    expect(perGroup).toEqual({
      creatures: 9,
      hooks: 9,
      people: 6,
      setting: 5,
      subgenres: 13,
      subjects: 6,
    });
  });

  it('gives each keyword id to one theme only, never to a genre', () => {
    const ids = LANDING_SLUGS.theme.flatMap(
      (slug) => themeBySlug(slug)?.keywordIds ?? [],
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(145);
    for (const genreKeyword of [315058, 316362, 9840]) {
      expect(ids).not.toContain(genreKeyword);
    }
  });

  it('names each theme, strongest keyword first', () => {
    expect(themeBySlug('time-travel')).toEqual({
      group: 'hooks',
      keywordIds: [4379, 5455, 10854],
      name: 'Time travel',
    });
    expect(themeBySlug('lgbtq')).toEqual({
      group: 'subjects',
      keywordIds: [158718, 163037, 1862, 250606, 363345],
      name: 'LGBTQ+',
    });
    expect(themeBySlug('family-dramas')).toEqual({
      genreId: 18,
      group: 'subgenres',
      keywordIds: [10041, 155294, 12279, 5683],
      name: 'Family dramas',
    });
    expect(themeBySlug('set-in-the-1980s')?.name).toBe('Set in the 1980s');
    expect(themeBySlug('heist')).toBeUndefined();
    expect(themeBySlug('constructor')).toBeUndefined();
  });

  it('leads a keyword to its theme, or to the genre TMDB only has as a keyword', () => {
    expect(keywordLanding(10854)).toEqual({
      slug: 'time-travel',
      type: 'theme',
    });
    expect(keywordLanding(9840)).toEqual({ slug: 'romance', type: 'genre' });
    expect(keywordLanding(315058)).toEqual({ slug: 'horror', type: 'genre' });
    expect(keywordLanding(10051)).toBeUndefined();
  });
});

describe('landing filters combined', () => {
  const theme = (slug: string) => landingFilter('theme', slug) ?? {};
  const genre = (slug: string) => landingFilter('genre', slug) ?? {};

  it('keeps a lone keyword set whole (any of its keywords)', () => {
    expect(allOf(theme('dystopia'), { with_genres: '18' })).toEqual({
      with_genres: '18',
      with_keywords: '4565|12190|178712',
    });
    expect(allOf(genre('crime'), theme('police'))).toEqual({
      with_genres: '80',
      with_keywords: '6149|268067|1812|15167|272551',
    });
  });

  it('never mixes , and | : two keyword conditions keep their strongest keyword each', () => {
    expect(allOf(theme('dystopia'), theme('time-travel'))).toEqual({
      with_keywords: '4565,4379',
    });
    expect(allOf(genre('horror'), theme('ghosts'))).toEqual({
      with_keywords: '315058,162846',
    });
    expect(allOf(theme('time-travel'), { with_keywords: '9706' })).toEqual({
      with_keywords: '4379,9706',
    });
  });

  it('requires every genre, once each', () => {
    expect(allOf(genre('drama'), theme('medical-dramas'))).toEqual({
      with_genres: '18',
      with_keywords: '208788|11612',
    });
    expect(allOf(genre('crime'), { with_genres: '18' })).toEqual({
      with_genres: '80,18',
    });
    expect(allOf(theme('family-dramas'), theme('workplace-comedies'))).toEqual({
      with_genres: '18,35',
      with_keywords: '10041,210605',
    });
  });

  it('leaves out the shows of another theme by its strongest keyword', () => {
    expect(excluding(theme('police'), theme('detectives'))).toEqual({
      with_keywords: '6149|268067|1812|15167|272551',
      without_keywords: '703',
    });
  });
});

describe('old discover links to landings', () => {
  const path = (query: Record<string, string>) =>
    landingPathFromDiscoverQuery(query);

  it('maps one genre, network, theme, country or language', () => {
    expect(path({ with_genres: '80' })).toBe('/genre/crime');
    expect(path({ with_networks: '49' })).toBe('/network/hbo');
    expect(path({ with_keywords: '4565' })).toBe('/theme/dystopia');
    // any keyword of a theme's set, and a genre TMDB keeps as a keyword
    expect(path({ with_keywords: '10854' })).toBe('/theme/time-travel');
    expect(path({ with_keywords: '9840' })).toBe('/genre/romance');
    expect(path({ with_origin_country: 'GB' })).toBe('/country/gb');
    expect(path({ with_original_language: 'ja' })).toBe('/language/ja');
  });

  it('maps a first-air-date window that is exactly a decade', () => {
    expect(
      path({
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
      }),
    ).toBe('/decade/2010s');
  });

  it('ignores sort and region, which the landings decide themselves', () => {
    expect(
      path({
        sort_by: 'vote_average.desc',
        watch_region: 'GB',
        with_genres: '80',
      }),
    ).toBe('/genre/crime');
  });

  it('ignores keys that are not discover filters (tracking, paging)', () => {
    expect(
      path({
        fbclid: 'x',
        gclid: 'y',
        utm_campaign: 'launch',
        utm_source: 'newsletter',
        with_genres: '80',
      }),
    ).toBe('/genre/crime');
    expect(path({ page: '2', ref: 'x', with_networks: '49' })).toBe(
      '/network/hbo',
    );
    expect(
      path({
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
        utm_medium: 'email',
      }),
    ).toBe('/decade/2010s');
    expect(path({ utm_source: 'newsletter' })).toBe('/discover');
  });

  it('goes to the hub when nothing maps', () => {
    expect(path({})).toBe('/discover');
    expect(path({ with_genres: '9999' })).toBe('/discover');
    expect(path({ with_networks: '999999' })).toBe('/discover');
    expect(path({ with_watch_providers: '8' })).toBe('/discover');
    // a retired theme (heist) has no landing
    expect(path({ with_keywords: '10051' })).toBe('/discover');
    expect(path({ 'first_air_date.gte': '2010-01-01' })).toBe('/discover');
  });

  it('goes to the hub when the filter is more than one landing', () => {
    expect(path({ with_genres: '80,18' })).toBe('/discover');
    expect(path({ with_genres: '80', with_networks: '49' })).toBe('/discover');
  });
});

describe('GET /network/:id', () => {
  it('returns the network with its logo and description', async () => {
    onTmdb('/network/49', {
      headquarters: 'New York City, New York',
      homepage: 'https://www.hbo.com',
      id: 49,
      logo_path: '/tuomPhY2UtuPTqqFnKMVHvSb724.png',
      name: 'HBO',
      origin_country: 'US',
    });

    const response = await request('/network/49');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('max-age=2629800');
    expect(await response.json()).toEqual({
      description:
        'Prestige drama since The Sopranos. Most of its series are finished stories you can start from the beginning.',
      homepage: 'https://www.hbo.com',
      id: 49,
      logo: 'https://image.tmdb.org/t/p/w500/tuomPhY2UtuPTqqFnKMVHvSb724.png',
      name: 'HBO',
      originCountry: { code: 'US', name: 'United States' },
      slug: 'hbo',
    });
  });

  it('has no description or slug for a network outside the table', async () => {
    onTmdb('/network/999999', { id: 999999, name: 'Tiny TV' });

    const body = await (await request('/network/999999')).json();

    expect(body).toEqual({
      description: null,
      homepage: null,
      id: 999999,
      logo: null,
      name: 'Tiny TV',
      originCountry: null,
      slug: null,
    });
  });

  it('answers 404 with a cached 404 for an unknown network', async () => {
    const response = await request('/network/12345678');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toContain('max-age=2629800');
  });

  it('answers a cached 404 for a path that is not an id', async () => {
    const response = await request('/network/hbo');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toContain('max-age=2629800');
  });
});
