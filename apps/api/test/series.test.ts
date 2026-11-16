import { describe, expect, it } from 'vitest';
import { db } from './db';
import { onGet, onTmdb, requestedUrls } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';

describe('B22 show ids', () => {
  it('exposes the IMDb id of a show', async () => {
    fakeShow({
      extra: { external_ids: { imdb_id: 'tt0903747', tvdb_id: 81189 } },
      id: 1396,
      seasons: [{ airDate: '2008-01-20', episodes: 7 }],
    });

    const body = (await (await request('/series/1396')).json()) as Record<
      string,
      unknown
    >;

    expect(body.externalIds).toEqual({ imdbId: 'tt0903747' });
  });

  it('has a null IMDb id when TMDB knows none', async () => {
    fakeShow({
      extra: { external_ids: { imdb_id: '' } },
      id: 5,
      seasons: [{ airDate: '2008-01-20', episodes: 1 }],
    });
    fakeShow({ id: 6, seasons: [{ airDate: '2008-01-20', episodes: 1 }] });

    for (const id of [5, 6]) {
      const body = (await (await request(`/series/${id}`)).json()) as Record<
        string,
        unknown
      >;
      expect(body.externalIds).toEqual({ imdbId: null });
    }
  });

  it('asks TMDB for the ids in the same request as the show', async () => {
    fakeShow({ id: 7, seasons: [{ airDate: '2008-01-20', episodes: 1 }] });
    onTmdb(
      '/tv/7',
      { id: 7, name: 'Seven' },
      { query: { append_to_response: 'external_ids' } },
    );

    const body = (await (await request('/series/7')).json()) as {
      title: string;
    };

    expect(body.title).toBe('Seven');
  });

  it('lists per-season episode counts, aired and total', async () => {
    fakeShow({
      id: 8,
      seasons: [
        { airDate: '2020-01-01', episodes: 10 },
        { airDate: '2021-01-01', aired: 4, episodes: 10 },
      ],
      status: 'Returning Series',
    });

    const body = (await (await request('/series/8')).json()) as {
      seasons: Array<{
        numberOfAiredEpisodes: number;
        numberOfEpisodes: number;
      }>;
    };
    const season = (await (await request('/series/8/season/2')).json()) as {
      numberOfAiredEpisodes: number;
      numberOfEpisodes: number;
    };

    expect(
      body.seasons.map((s) => [s.numberOfEpisodes, s.numberOfAiredEpisodes]),
    ).toEqual([
      [10, 10],
      [10, 4],
    ]);
    expect([season.numberOfEpisodes, season.numberOfAiredEpisodes]).toEqual([
      10, 4,
    ]);
  });
});

describe('specials (season 0) beside the seasons', () => {
  type Body = {
    numberOfAiredEpisodes: number;
    numberOfEpisodes: number;
    seasons: Array<{ seasonNumber: number }>;
    specials?: {
      airDate: string;
      numberOfAiredEpisodes: number;
      numberOfEpisodes: number;
      seasonNumber: number;
      title: string;
    };
  };
  const show = async (id: number) =>
    (await (await request(`/series/${id}`)).json()) as Body;

  it('answers them as `specials`, never in `seasons` or the show totals', async () => {
    fakeShow({
      id: 4801,
      seasons: [{ airDate: '2020-01-01', episodes: 4 }],
      specials: { airDate: '2020-06-01', episodes: 3 },
    });
    const body = await show(4801);
    expect(body.seasons.map((season) => season.seasonNumber)).toEqual([1]);
    expect(body.numberOfAiredEpisodes).toBe(4);
    expect(body.specials).toMatchObject({
      airDate: '2020-06-01T00:00:00.000Z',
      numberOfAiredEpisodes: 3,
      numberOfEpisodes: 3,
      seasonNumber: 0,
      title: 'Specials',
    });
  });

  it('has none without a season 0', async () => {
    fakeShow({ id: 4802, seasons: [{ airDate: '2020-01-01', episodes: 4 }] });
    expect(await show(4802)).not.toHaveProperty('specials');
  });

  it('counts none aired before the first special airs', async () => {
    fakeShow({
      id: 4803,
      seasons: [{ airDate: '2020-01-01', episodes: 4 }],
      specials: { airDate: '2099-12-24', episodes: 1 },
    });
    expect((await show(4803)).specials).toMatchObject({
      numberOfAiredEpisodes: 0,
      numberOfEpisodes: 1,
    });
  });

  it('counts the specials before the next one to air', async () => {
    fakeShow({
      extra: {
        next_episode_to_air: {
          air_date: '2099-12-24',
          episode_number: 3,
          id: 2,
          name: 'Next',
          season_number: 0,
        },
      },
      id: 4804,
      seasons: [{ airDate: '2020-01-01', episodes: 4 }],
      specials: { airDate: '2020-06-01', episodes: 3 },
    });
    expect((await show(4804)).specials).toMatchObject({
      numberOfAiredEpisodes: 2,
      numberOfEpisodes: 3,
    });
  });
});

describe('B06 episode credits', () => {
  const setup = () => {
    fakeShow({ id: 9, seasons: [{ airDate: '2020-01-01', episodes: 2 }] });
    onTmdb(
      '/tv/9/season/1/episode/2',
      {
        air_date: '2020-01-08',
        credits: {
          crew: [
            { id: 30, job: 'Director', name: 'Dir Ector', profile_path: null },
          ],
          guest_stars: [
            {
              character: 'Uncle Jimmy',
              id: 20,
              name: 'Guest Star',
              profile_path: '/gs.jpg',
            },
          ],
        },
        episode_number: 2,
        id: 90102,
        name: 'Two',
        runtime: 30,
        season_number: 1,
      },
      { query: { append_to_response: 'credits' } },
    );
  };

  it('adds guest stars and crew with ?view=credits', async () => {
    setup();

    const body = (await (
      await request('/series/9/season/1/episode/2?view=credits')
    ).json()) as Record<string, unknown>;

    expect(body.title).toBe('Two');
    expect(body.credits).toEqual({
      crew: [
        {
          character: '',
          id: 30,
          image: '',
          job: 'Director',
          name: 'Dir Ector',
        },
      ],
      guestStars: [
        {
          character: 'Uncle Jimmy',
          id: 20,
          image: expect.stringContaining('/gs.jpg'),
          job: '',
          name: 'Guest Star',
        },
      ],
    });
  });

  it('leaves the response without ?view exactly as it was', async () => {
    setup();

    const body = (await (
      await request('/series/9/season/1/episode/2')
    ).json()) as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual([
      'airDate',
      'description',
      'episodeNumber',
      'hasAired',
      'id',
      'runtime',
      'seasonNumber',
      'stillImage',
      'stillPath',
      'title',
    ]);
  });

  it('rejects an unknown view', async () => {
    setup();

    expect(
      (await request('/series/9/season/1/episode/2?view=cast')).status,
    ).toBe(400);
  });

  it('is a 404 for an unknown episode', async () => {
    expect(
      (await request('/series/9/season/1/episode/9?view=credits')).status,
    ).toBe(404);
  });
});

describe('B05 episode IMDb ratings', () => {
  const OMDB = 'https://www.omdbapi.com/';
  const setup = () =>
    fakeShow({
      extra: { external_ids: { imdb_id: 'tt0903747' } },
      id: 10,
      seasons: [{ airDate: '2020-01-01', episodes: 3 }],
    });
  const omdbSeason = {
    Episodes: [
      { Episode: '1', imdbRating: '9.6' },
      { Episode: '2', imdbRating: 'N/A' },
    ],
    Response: 'True',
    Season: '1',
  };
  const ratings = async () => {
    const response = await request('/series/10/season/1/ratings');
    return {
      body: (await response.json()) as unknown,
      cacheControl: response.headers.get('cache-control'),
      status: response.status,
    };
  };
  const cacheRows = () =>
    db.dump('Cache').filter((item) => String(item.pk).includes('omdb:v2'));

  /** Days a stored rating stays fresh (it is kept longer, to stand in) */
  const freshDays = (row: Record<string, unknown> | undefined) =>
    ((JSON.parse(String(row?.value)) as { freshUntil: number }).freshUntil -
      Date.now()) /
    86_400_000;

  it('maps one OMDb season call to ratings by episode number', async () => {
    setup();
    onGet(OMDB, omdbSeason, {
      query: { apikey: 'test-omdb', i: 'tt0903747', Season: '1' },
    });

    const { body, cacheControl } = await ratings();

    expect(body).toEqual({
      ratings: { 1: { imdbRating: 9.6 }, 2: { imdbRating: null } },
    });
    expect(cacheControl).toContain('s-maxage=604800');
  });

  it('caches a found season for 14 days under omdb:v2:<imdbId>:<season>', async () => {
    setup();
    onGet(OMDB, omdbSeason);

    await ratings();

    const [row] = cacheRows();
    expect(row?.pk).toBe('CACHE#omdb:v2:tt0903747:1');
    expect(Math.round(freshDays(row))).toBe(14);
  });

  it('serves the second request from the cache', async () => {
    setup();
    onGet(OMDB, omdbSeason);
    await ratings();
    onGet(OMDB, { Error: 'Request limit reached!', Response: 'False' });

    expect((await ratings()).body).toEqual({
      ratings: { 1: { imdbRating: 9.6 }, 2: { imdbRating: null } },
    });
  });

  it('caches a season OMDb does not know for 1 day', async () => {
    setup();
    onGet(OMDB, { Error: 'Series or season not found!', Response: 'False' });

    expect((await ratings()).body).toEqual({ ratings: {} });

    const [row] = cacheRows();
    expect(Math.round(freshDays(row))).toBe(1);
  });

  it('never caches a reached request limit and does not let the CDN keep it', async () => {
    setup();
    onGet(
      OMDB,
      { Error: 'Request limit reached!', Response: 'False' },
      { status: 401 },
    );

    const result = await ratings();

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ratings: {} });
    expect(result.cacheControl).toBe('no-store');
    expect(cacheRows()).toEqual([]);
  });

  it('gives empty ratings when OMDb is unreachable (a 500)', async () => {
    setup();
    onGet(OMDB, { Error: 'boom' }, { status: 500 });

    const result = await ratings();

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ratings: {} });
    expect(cacheRows()).toEqual([]);
  });

  it('gives empty ratings for a show without an IMDb id, without calling OMDb', async () => {
    fakeShow({ id: 10, seasons: [{ airDate: '2020-01-01', episodes: 1 }] });

    expect((await ratings()).body).toEqual({ ratings: {} });
  });

  it('is a 404 for an unknown show', async () => {
    expect((await request('/series/999/season/1/ratings')).status).toBe(404);
  });
});

describe('GET /series/:id/runtimes', () => {
  const seasonWith = (runtimes: ReadonlyArray<number | null>) => ({
    episodes: runtimes.map((runtime, index) => ({
      episode_number: index + 1,
      runtime,
    })),
  });

  it('reads every regular season in one TMDB call per 20 seasons', async () => {
    const seasons = Array.from({ length: 23 }, (_, index) => ({
      airDate: `${2000 + index}-01-01`,
      episodes: 2,
    }));
    fakeShow({
      id: 456,
      seasons,
      specials: { airDate: '1999-12-17', episodes: 3 },
    });
    const first = Array.from(
      { length: 20 },
      (_, index) => `season/${index + 1}`,
    );
    onTmdb(
      '/tv/456',
      Object.fromEntries(first.map((key) => [key, seasonWith([22, 23])])),
      { query: { append_to_response: first.join(',') } },
    );
    onTmdb(
      '/tv/456',
      {
        'season/21': seasonWith([21, null]),
        'season/22': seasonWith([30, 31]),
        'season/23': seasonWith([]),
      },
      { query: { append_to_response: 'season/21,season/22,season/23' } },
    );

    const response = await request('/series/456/runtimes');
    const body = (await response.json()) as Record<string, number[]>;

    expect(response.headers.get('cache-control')).toContain('max-age=');
    expect(Object.keys(body)).toHaveLength(23);
    expect(body['0']).toBeUndefined();
    expect(body['1']).toEqual([22, 23]);
    expect(body['21']).toEqual([21, 0]);
    expect(body['22']).toEqual([30, 31]);
    expect(body['23']).toEqual([]);
    const seasonCalls = requestedUrls().filter((url) =>
      /^\/3\/tv\/456\/season\//.test(url.pathname),
    );
    expect(seasonCalls).toHaveLength(0);
  });

  it('is a 404 for an unknown show', async () => {
    const response = await request('/series/987654/runtimes');
    expect(response.status).toBe(404);
  });
});
