import { allOf, excluding, landingFilter } from '@tvseri.es/constants';
import { normalizeDiscoverQuery } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { onTmdb } from './fakeHttp';
import { request } from './request';

const normalize = (params: Record<string, string>) =>
  normalizeDiscoverQuery(params).query;

describe('landing filters through normalizeDiscoverQuery', () => {
  const theme = (slug: string) => landingFilter('theme', slug) ?? {};

  it('passes a theme’s keyword set (OR) and a genre-bound theme as they are, ids sorted', () => {
    expect(normalize(theme('time-travel'))).toEqual({
      with_keywords: '4379|5455|10854',
    });
    expect(normalize(theme('dystopia'))).toEqual({
      with_keywords: '4565|12190|178712',
    });
    expect(normalize(theme('medical-dramas'))).toEqual({
      with_genres: '18',
      with_keywords: '11612|208788',
    });
  });

  it('passes the combined filters the landings send, and keeps two sets apart', () => {
    expect(normalize(allOf(theme('dystopia'), theme('time-travel')))).toEqual({
      with_keywords: '4379,4565',
    });
    expect(normalize(excluding(theme('police'), theme('detectives')))).toEqual({
      with_keywords: '1812|6149|15167|268067|272551',
      without_keywords: '703',
    });
    // a different set is a different query (and cache key)
    expect(normalizeDiscoverQuery(theme('ghosts')).queryString).not.toBe(
      normalizeDiscoverQuery(theme('monsters')).queryString,
    );
  });
});

describe('B01 normalizeDiscoverQuery: wider whitelist', () => {
  it('keeps date windows in YYYY-MM-DD form', () => {
    expect(
      normalize({
        'air_date.gte': '2026-01-01',
        'air_date.lte': '2026-12-31',
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
      }),
    ).toEqual({
      'air_date.gte': '2026-01-01',
      'air_date.lte': '2026-12-31',
      'first_air_date.gte': '2010-01-01',
      'first_air_date.lte': '2019-12-31',
    });
  });

  it('drops malformed or impossible dates', () => {
    expect(
      normalize({
        'air_date.gte': '2026-13-01',
        'air_date.lte': '2026-02-30',
        'first_air_date.gte': '2010',
        'first_air_date.lte': 'yesterday',
      }),
    ).toEqual({});
  });

  it('keeps ratings 0 to 10 and writes them in canonical form', () => {
    expect(
      normalize({ 'vote_average.gte': '8.0', 'vote_average.lte': '9.50' }),
    ).toEqual({ 'vote_average.gte': '8', 'vote_average.lte': '9.5' });
  });

  it('drops ratings out of range', () => {
    expect(
      normalize({ 'vote_average.gte': '11', 'vote_average.lte': '-1' }),
    ).toEqual({});
  });

  it('keeps whole-number counts and runtimes, drops the rest', () => {
    expect(
      normalize({
        'vote_count.gte': '050',
        'vote_count.lte': '1000',
        'with_runtime.gte': '20',
        'with_runtime.lte': '60',
      }),
    ).toEqual({
      'vote_count.gte': '50',
      'vote_count.lte': '1000',
      'with_runtime.gte': '20',
      'with_runtime.lte': '60',
    });
    expect(
      normalize({ 'vote_count.gte': '1.5', 'with_runtime.lte': 'abc' }),
    ).toEqual({});
  });

  it('keeps id lists for without_keywords and without_genres, sorted and deduped', () => {
    expect(
      normalize({ without_genres: '35,18,35', without_keywords: '10596|4565' }),
    ).toEqual({ without_genres: '18,35', without_keywords: '4565|10596' });
    expect(normalize({ without_keywords: '1,2|3' })).toEqual({});
  });

  it('accepts several networks as a list', () => {
    expect(normalize({ with_networks: '49|213' })).toEqual({
      with_networks: '49|213',
    });
  });

  it('keeps with_status 0-5 and with_type 0-6 only', () => {
    expect(normalize({ with_status: '0', with_type: '2|4' })).toEqual({
      with_status: '0',
      with_type: '2|4',
    });
    expect(normalize({ with_status: '6', with_type: '7' })).toEqual({});
  });

  it('accepts the sort orders the landings use', () => {
    for (const sort of [
      'first_air_date.asc',
      'original_name.asc',
      'popularity.asc',
      'vote_average.asc',
      'vote_count.asc',
    ]) {
      expect(normalize({ sort_by: sort })).toEqual({ sort_by: sort });
    }
    expect(normalize({ sort_by: 'revenue.desc' })).toEqual({});
  });

  it('writes keys sorted, so equal filters give one cache key', () => {
    const a = normalizeDiscoverQuery({
      'first_air_date.gte': '2020-01-01',
      'vote_count.gte': '50',
      with_genres: '80',
    }).queryString;
    const b = normalizeDiscoverQuery({
      'first_air_date.gte': '2020-01-01',
      'vote_count.gte': '050',
      with_genres: '80',
    }).queryString;
    expect(a).toBe(
      '?first_air_date.gte=2020-01-01&vote_count.gte=50&with_genres=80',
    );
    expect(b).toBe(a);
  });

  it('is idempotent', () => {
    const once = normalizeDiscoverQuery({
      'vote_average.gte': '8.0',
      with_status: '0',
      without_keywords: '2,1',
    });
    const twice = normalizeDiscoverQuery(once.query);
    expect(twice).toEqual(once);
  });
});

describe('B01 GET /discover', () => {
  it('forwards the wider filters to TMDB', async () => {
    onTmdb(
      '/discover/tv',
      {
        page: 1,
        results: [{ id: 7, name: 'Gem', poster_path: '/p.jpg' }],
        total_pages: 1,
        total_results: 1,
      },
      {
        query: {
          'first_air_date.gte': '2016-01-01',
          'vote_average.gte': '8',
          'vote_count.gte': '50',
          'vote_count.lte': '1000',
          without_keywords: '4565',
        },
      },
    );

    const response = await request(
      '/discover?vote_average.gte=8.0&vote_count.gte=50&vote_count.lte=1000&first_air_date.gte=2016-01-01&without_keywords=4565&evil=1',
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { id: number }[] };
    expect(body.items.map((item) => item.id)).toEqual([7]);
  });
});
