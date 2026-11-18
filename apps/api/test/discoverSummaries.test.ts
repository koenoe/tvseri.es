import type { LandingCounts, SeriesSummaries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onTmdb, resetHttp } from './fakeHttp';
import { request } from './request';

// What the API adds to every discover query
const DISCOVER_DEFAULTS = {
  include_adult: 'false',
  include_null_first_air_dates: 'false',
  page: '1',
  sort_by: 'popularity.desc',
};

/** TMDB's total for a discover query (counts ask for every show: no vote floor) */
const count = (query: Record<string, string>, total: number) =>
  onTmdb(
    '/discover/tv',
    { page: 1, results: [], total_pages: 1, total_results: total },
    {
      exact: true,
      query: { ...DISCOVER_DEFAULTS, ...query, 'vote_count.gte': '0' },
    },
  );

const get = async <T>(path: string) => {
  const response = await request(path);
  return {
    body: (await response.json()) as T,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

describe('GET /discover/landing/:type/counts', () => {
  it('counts each landing the way its facts do, leaving out unknown slugs', async () => {
    count({ with_genres: '80' }, 10927);
    count({ with_genres: '18' }, 38400);

    const { body, cacheControl, status } = await get<LandingCounts>(
      '/discover/landing/genre/counts?slugs=crime,drama,not-a-genre',
    );

    expect(status).toBe(200);
    expect(body).toEqual({ counts: { crime: 10927, drama: 38400 } });
    // an answer that misses a slug (a web build ahead of this API) is kept a day
    expect(cacheControl).toContain('s-maxage=86400');
  });

  it('keeps a complete counts answer for a week', async () => {
    count({ with_genres: '80' }, 10927);

    const { cacheControl } = await get<LandingCounts>(
      '/discover/landing/genre/counts?slugs=crime',
    );

    expect(cacheControl).toContain('s-maxage=604800');
  });

  it('reads slugs case-insensitively and once, for every landing type', async () => {
    count({ with_origin_country: 'GB' }, 7240);

    const { body } = await get<LandingCounts>(
      '/discover/landing/country/counts?slugs=GB,gb,Gb',
    );

    expect(body).toEqual({ counts: { gb: 7240 } });
  });

  it('counts decades with their air-date window', async () => {
    count(
      {
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
      },
      41800,
    );

    const { body } = await get<LandingCounts>(
      '/discover/landing/decade/counts?slugs=2010s',
    );

    expect(body).toEqual({ counts: { '2010s': 41800 } });
  });

  it('is empty when no slug is a landing', async () => {
    const { body, status } = await get<LandingCounts>(
      '/discover/landing/theme/counts?slugs=nope',
    );

    expect([status, body]).toEqual([200, { counts: {} }]);
  });

  it('does not clash with the facts route', async () => {
    count({ with_original_language: 'ja' }, 16900);

    const { body } = await get<{ count: number }>(
      '/discover/landing/language/ja/facts',
    );

    expect(body.count).toBe(16900);
  });

  it('rejects a bad type, a missing, malformed or oversized slug list', async () => {
    expect((await get('/discover/landing/planet/counts?slugs=a')).status).toBe(
      400,
    );
    expect((await get('/discover/landing/genre/counts')).status).toBe(400);
    expect((await get('/discover/landing/genre/counts?slugs=')).status).toBe(
      400,
    );
    expect(
      (await get('/discover/landing/genre/counts?slugs=a,,b')).status,
    ).toBe(400);
    expect(
      (await get('/discover/landing/genre/counts?slugs=a%20b')).status,
    ).toBe(400);
    const many = Array.from({ length: 21 }, (_, i) => `s${i}`).join(',');
    expect(
      (await get(`/discover/landing/genre/counts?slugs=${many}`)).status,
    ).toBe(400);
  });
});

const tv = (id: number, extra: Record<string, unknown> = {}) =>
  onTmdb(`/tv/${id}`, {
    episode_run_time: [50],
    first_air_date: '2019-04-14',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 10765, name: 'Sci-Fi & Fantasy' },
    ],
    id,
    last_air_date: '2020-06-01',
    name: `Show ${id}`,
    networks: [
      { id: 49, name: 'HBO' },
      { id: 213, name: 'Netflix' },
    ],
    seasons: [
      { air_date: '2019-04-14', episode_count: 4, season_number: 0 },
      { air_date: '2019-04-14', episode_count: 8, season_number: 1 },
      { air_date: '2020-04-14', episode_count: 10, season_number: 2 },
    ],
    status: 'Ended',
    ...extra,
  });

describe('GET /series/summaries', () => {
  it('summarises each show from its facts, null where TMDB has none', async () => {
    tv(1);
    tv(2, {
      first_air_date: '',
      last_air_date: null,
      networks: [],
      status: 'Returning Series',
    });

    const { body, cacheControl, status } = await get<SeriesSummaries>(
      '/series/summaries?ids=1,2,99',
    );

    expect(status).toBe(200);
    expect(cacheControl).toContain('s-maxage=604800');
    expect(body).toEqual({
      '1': {
        genreIds: [18, 10765],
        id: 1,
        lastAirYear: 2020,
        networks: [
          { id: 49, name: 'HBO' },
          { id: 213, name: 'Netflix' },
        ],
        numberOfEpisodes: 18,
        numberOfSeasons: 2,
        status: 'Ended',
        totalMinutes: 900,
        year: 2019,
      },
      '2': {
        genreIds: [18, 10765],
        id: 2,
        lastAirYear: null,
        networks: [],
        numberOfEpisodes: 18,
        numberOfSeasons: 2,
        status: 'Returning Series',
        totalMinutes: 900,
        year: null,
      },
      '99': null,
    });
  });

  it('has no total length when TMDB has no runtime', async () => {
    tv(3, { episode_run_time: [] });

    const { body } = await get<SeriesSummaries>('/series/summaries?ids=3');

    expect(body['3']?.totalMinutes).toBeNull();
  });

  it('shares the facts cache with the other routes', async () => {
    tv(1);
    await request('/series/summaries?ids=1');
    resetHttp();

    const { body } = await get<SeriesSummaries>('/series/summaries?ids=1');

    expect(body['1']?.id).toBe(1);
    expect(db.dump('Cache').map((item) => String(item.pk))).toContain(
      'CACHE#series-facts:v2:1',
    );
  });

  it('answers a retryable 503, never cached, when TMDB fails for a show', async () => {
    tv(1);
    onTmdb('/tv/2', { status_message: 'boom' }, { status: 500 });

    const failed = await get<unknown>('/series/summaries?ids=1,2,99');

    expect(failed.status).toBe(503);
    expect(failed.cacheControl).toBe('no-store');

    // the show that did answer is cached, so the retry only asks for the other
    tv(2);
    const retried = await get<SeriesSummaries>('/series/summaries?ids=1,2,99');
    expect(retried.status).toBe(200);
    expect(retried.cacheControl).toContain('s-maxage=604800');
    expect(Object.keys(retried.body)).toEqual(['1', '2', '99']);
    expect(retried.body['99']).toBeNull();
  });

  it('rejects a missing, malformed or oversized id list', async () => {
    expect((await get('/series/summaries')).status).toBe(400);
    expect((await get('/series/summaries?ids=a,b')).status).toBe(400);
    const many = Array.from({ length: 51 }, (_, i) => i + 1).join(',');
    expect((await get(`/series/summaries?ids=${many}`)).status).toBe(400);
  });
});
