import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onGet, onTmdb, requestedUrls } from './fakeHttp';
import { request } from './request';

describe('person external ids (socials)', () => {
  it('returns the links the Socials row draws, in a fixed order, without Facebook', async () => {
    onTmdb('/person/17419/external_ids', {
      facebook_id: 'BryanCranston',
      id: 17419,
      imdb_id: 'nm0186505',
      instagram_id: 'bryancranston',
      tiktok_id: null,
      twitter_id: 'BryanCranston',
      wikidata_id: 'Q23547',
      youtube_id: '',
    });

    const response = await request('/person/17419/external-ids');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('public');
    expect(await response.json()).toEqual({
      links: [
        {
          id: 'nm0186505',
          type: 'imdb',
          url: 'https://www.imdb.com/name/nm0186505/',
        },
        {
          id: 'bryancranston',
          type: 'instagram',
          url: 'https://www.instagram.com/bryancranston/',
        },
        {
          id: 'BryanCranston',
          type: 'x',
          url: 'https://x.com/BryanCranston',
        },
        {
          id: 'Q23547',
          type: 'wikidata',
          url: 'https://www.wikidata.org/wiki/Q23547',
        },
      ],
    });
  });

  it('returns an empty list when the person has no ids', async () => {
    onTmdb('/person/5/external_ids', { id: 5 });

    const response = await request('/person/5/external-ids');

    expect(await response.json()).toEqual({ links: [] });
  });

  it('404s for an unknown person', async () => {
    const response = await request('/person/999/external-ids');

    expect(response.status).toBe(404);
  });

  it('strips unsafe characters from ids', async () => {
    onTmdb('/person/6/external_ids', { id: 6, instagram_id: 'a/../b?x' });

    const response = await request('/person/6/external-ids');

    expect(await response.json()).toEqual({ links: [] });
  });
});

const castCredit = (overrides: Record<string, unknown>) => ({
  character: '',
  credit_id: `c${overrides.id}`,
  episode_count: 1,
  first_air_date: '2010-01-01',
  genre_ids: [18],
  name: `Show ${overrides.id}`,
  poster_path: `/p${overrides.id}.jpg`,
  ...overrides,
});

const crewCredit = (overrides: Record<string, unknown>) => ({
  credit_id: `k${overrides.id}${overrides.job}`,
  department: 'Directing',
  episode_count: 1,
  first_air_date: '2010-01-01',
  genre_ids: [18],
  job: 'Director',
  name: `Show ${overrides.id}`,
  poster_path: `/p${overrides.id}.jpg`,
  ...overrides,
});

const getShows = async (cast: unknown[], crew: unknown[] = []) => {
  onTmdb('/person/1/tv_credits', { cast, crew, id: 1 });
  const response = await request('/person/1/shows');
  return {
    body: (await response.json()) as {
      counts: Record<string, number>;
      self: Array<Record<string, unknown>>;
      shows: Array<Record<string, unknown>>;
      upcoming: Array<Record<string, unknown>>;
    },
    response,
  };
};

describe('person gender', () => {
  it.each([
    [1, 'female'],
    [2, 'male'],
    [3, 'non-binary'],
  ])('maps TMDB gender %i to %s', async (gender, expected) => {
    onTmdb('/person/17419', { gender, id: 17419, name: 'Bryan Cranston' });

    const body = (await (await request('/person/17419')).json()) as {
      gender?: string;
    };

    expect(body.gender).toBe(expected);
  });

  it.each([[0], [undefined]])('leaves gender out for %s', async (gender) => {
    onTmdb('/person/17419', { gender, id: 17419, name: 'Bryan Cranston' });

    const body = (await (await request('/person/17419')).json()) as object;

    expect(body).not.toHaveProperty('gender');
  });
});

describe('person known for', () => {
  it('gives a film its release date (Known for: "Film · 2015")', async () => {
    onTmdb('/person/17419', { id: 17419, name: 'Bryan Cranston' });
    onTmdb('/search/person', {
      results: [
        {
          id: 17419,
          known_for: [
            {
              id: 1,
              media_type: 'movie',
              poster_path: '/trumbo.jpg',
              release_date: '2015-09-12',
              title: 'Trumbo',
            },
          ],
          name: 'Bryan Cranston',
        },
      ],
    });

    const body = (await (
      await request('/person/17419/known-for')
    ).json()) as ReadonlyArray<{ title: string; releaseDate?: string }>;

    expect(body[0]).toMatchObject({
      releaseDate: '2015-09-12',
      title: 'Trumbo',
    });
  });
});

describe('merged credits', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  });

  it('merges cast and crew per show into one row', async () => {
    const { body, response } = await getShows(
      [
        castCredit({
          character: 'Walter White',
          episode_count: 62,
          id: 10,
          popularity: 88.4,
          vote_count: 16_000,
        }),
      ],
      [
        crewCredit({ episode_count: 1, id: 10, job: 'Director' }),
        crewCredit({
          department: 'Production',
          episode_count: 16,
          id: 10,
          job: 'Executive Producer',
        }),
      ],
    );

    expect(response.headers.get('cache-control')).toContain('public');
    expect(body.shows).toEqual([
      {
        characters: ['Walter White'],
        crewJobs: [
          { episodeCount: 1, job: 'Director' },
          { episodeCount: 16, job: 'Executive Producer' },
        ],
        episodeCount: 62,
        firstAirDate: '2010-01-01',
        id: 10,
        isCast: true,
        isCrew: true,
        isGuest: false,
        isVoice: false,
        jobs: ['Director', 'Executive Producer'],
        name: 'Show 10',
        // how widely seen the show is: Known for ranks by it
        popularity: 88.4,
        posterImage: expect.stringContaining('/p10.jpg'),
        role: 'Walter White',
        slug: 'show-10',
        voteCount: 16_000,
        year: 2010,
      },
    ]);
  });

  it('counts episodes per crew job: the most TMDB gives, 0 when missing', async () => {
    const { body } = await getShows(
      [],
      [
        crewCredit({ episode_count: 1, id: 14, job: 'Director' }),
        crewCredit({ episode_count: 3, id: 14, job: 'Director' }),
        crewCredit({ episode_count: 2, id: 14, job: 'Writer' }),
        crewCredit({ episode_count: undefined, id: 14, job: 'Creator' }),
      ],
    );

    expect(body.shows[0]?.crewJobs).toEqual([
      { episodeCount: 3, job: 'Director' },
      { episodeCount: 2, job: 'Writer' },
      { episodeCount: 0, job: 'Creator' },
    ]);
    expect(body.shows[0]?.jobs).toEqual(['Director', 'Writer', 'Creator']);
  });

  it('leaves crewJobs out for a show without crew credits', async () => {
    const { body } = await getShows([castCredit({ character: 'Hal', id: 15 })]);

    expect(body.shows[0]).not.toHaveProperty('crewJobs');
  });

  it('describes a crew-only show by its jobs', async () => {
    const { body } = await getShows(
      [],
      [crewCredit({ id: 11, job: 'Director' })],
    );

    expect(body.shows[0]).toMatchObject({
      isCast: false,
      isCrew: true,
      role: 'Director',
    });
  });

  it('keeps shows in the Talk, News, Soap and Kids genres', async () => {
    const { body } = await getShows([
      castCredit({
        character: 'Dil (voice)',
        genre_ids: [10762],
        id: 12,
      }),
      castCredit({ character: 'Mike', genre_ids: [10766], id: 13 }),
    ]);

    expect(body.shows.map((show) => show.id).sort()).toEqual([12, 13]);
    expect(body.shows.find((show) => show.id === 12)).toMatchObject({
      isVoice: true,
    });
  });

  it('splits "Self" appearances out of the shows', async () => {
    const { body } = await getShows(
      [
        castCredit({ character: 'Himself', genre_ids: [10767], id: 20 }),
        castCredit({ character: 'Self - Guest', id: 21 }),
        castCredit({ character: '', genre_ids: [10767], id: 22 }),
        castCredit({ character: 'Walter White', episode_count: 62, id: 23 }),
        castCredit({ character: 'Himself', id: 24 }),
      ],
      [crewCredit({ id: 24, job: 'Executive Producer' })],
    );

    expect(body.self.map((show) => show.id).sort()).toEqual([20, 21, 22]);
    expect(body.shows.map((show) => show.id).sort()).toEqual([23, 24]);
    expect(body.counts).toMatchObject({ all: 2, self: 3 });
  });

  it('flags guest roles (one episode) and counts the filter pills', async () => {
    const { body } = await getShows(
      [
        castCredit({ character: 'Cop', episode_count: 1, id: 30 }),
        castCredit({ character: 'Dad', episode_count: 20, id: 31 }),
        castCredit({ character: 'Bear (voice)', episode_count: 4, id: 32 }),
      ],
      [crewCredit({ id: 33 })],
    );

    expect(body.shows.find((show) => show.id === 30)).toMatchObject({
      isGuest: true,
    });
    expect(body.shows.find((show) => show.id === 31)).toMatchObject({
      isGuest: false,
    });
    expect(body.counts).toEqual({
      acting: 3,
      all: 4,
      behindTheCamera: 1,
      guest: 1,
      self: 0,
      upcoming: 0,
      voice: 1,
    });
  });

  it('sorts the newest first and puts undated shows last', async () => {
    onTmdb('/tv/42', { id: 42, status: 'Ended' });
    const { body } = await getShows([
      castCredit({ first_air_date: '2001-05-01', id: 40 }),
      castCredit({ first_air_date: '2019-05-01', id: 41 }),
      castCredit({ first_air_date: '', id: 42 }),
    ]);

    expect(body.shows.map((show) => show.id)).toEqual([41, 40, 42]);
    expect(body.shows[2]?.year).toBeUndefined();
  });

  it('groups upcoming work: dated first, in development after', async () => {
    onTmdb('/tv/50', { id: 50, status: 'Planned' });
    onTmdb('/tv/51', {
      first_air_date: '2027-06-12',
      id: 51,
      status: 'Returning Series',
    });
    onTmdb('/tv/52', { id: 52, status: 'Ended' });
    const { body } = await getShows([
      castCredit({ character: 'A', first_air_date: '', id: 50 }),
      castCredit({ character: 'B', first_air_date: '2027-06-12', id: 51 }),
      castCredit({ character: 'C', first_air_date: '', id: 52 }),
    ]);

    expect(body.upcoming.map((show) => [show.id, show.upcoming])).toEqual([
      [51, { date: '2027-06-12', state: 'dated' }],
      [50, { state: 'in-development' }],
    ]);
    expect(body.shows.map((show) => show.id)).toEqual([52]);
    expect(body.counts).toMatchObject({ all: 3, upcoming: 2 });
  });

  it('still answers when the upcoming lookups fail', async () => {
    const { body } = await getShows([
      castCredit({ character: 'A', first_air_date: '', id: 60 }),
    ]);

    expect(body.shows.map((show) => show.id)).toEqual([60]);
  });

  it('404s for an unknown person', async () => {
    const response = await request('/person/999/shows');

    expect(response.status).toBe(404);
  });
});

describe('career chart', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  });

  const setup = () => {
    onTmdb('/person/1/tv_credits', {
      cast: [
        castCredit({
          character: 'Walter White',
          episode_count: 62,
          first_air_date: '2008-01-20',
          id: 100,
        }),
        castCredit({
          character: 'Hal',
          episode_count: 151,
          first_air_date: '2000-01-09',
          id: 101,
        }),
        castCredit({
          character: 'Cop',
          episode_count: 1,
          first_air_date: '1982-03-01',
          id: 102,
        }),
        castCredit({
          character: 'Cashier',
          episode_count: 1,
          first_air_date: '2022-03-01',
          id: 103,
        }),
        castCredit({
          character: 'Himself',
          episode_count: 3,
          first_air_date: '2015-03-01',
          id: 104,
        }),
        castCredit({ character: 'Lead', first_air_date: '', id: 105 }),
        castCredit({
          character: 'Dad',
          episode_count: 6,
          first_air_date: '2020-01-01',
          id: 106,
        }),
      ],
      crew: [
        crewCredit({ episode_count: 2, first_air_date: '2013-01-01', id: 107 }),
      ],
    });
    onTmdb('/tv/100', {
      first_air_date: '2008-01-20',
      id: 100,
      last_air_date: '2013-09-29',
      status: 'Ended',
    });
    onTmdb('/tv/101', {
      first_air_date: '2000-01-09',
      id: 101,
      last_air_date: '2006-06-04',
      status: 'Ended',
    });
    onTmdb('/tv/105', { id: 105, status: 'Planned' });
    onTmdb('/tv/106', {
      first_air_date: '2020-01-01',
      id: 106,
      last_air_date: '2026-10-01',
      status: 'Returning Series',
    });
    onTmdb('/tv/107', {
      first_air_date: '2013-01-01',
      id: 107,
      last_air_date: '2013-06-01',
      status: 'Canceled',
    });
  };

  it('draws one row per series with years and bar weight, guest roles as ticks', async () => {
    setup();

    const response = await request('/person/1/career');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('public');
    expect(await response.json()).toEqual({
      guest: {
        count: 2,
        firstYear: 1982,
        lastYear: 2022,
        ticks: [
          { id: 102, name: 'Show 102', year: 1982 },
          { id: 103, name: 'Show 103', year: 2022 },
        ],
      },
      rows: [
        {
          endYear: 2006,
          episodeCount: 151,
          id: 101,
          name: 'Show 101',
          ongoing: false,
          role: 'Hal',
          slug: 'show-101',
          startYear: 2000,
          weight: 3,
        },
        {
          endYear: 2013,
          episodeCount: 62,
          id: 100,
          name: 'Show 100',
          ongoing: false,
          role: 'Walter White',
          slug: 'show-100',
          startYear: 2008,
          weight: 3,
        },
        {
          endYear: 2013,
          episodeCount: 2,
          id: 107,
          name: 'Show 107',
          ongoing: false,
          role: 'Director',
          slug: 'show-107',
          startYear: 2013,
          weight: 1,
        },
        {
          endYear: 2026,
          episodeCount: 6,
          id: 106,
          name: 'Show 106',
          ongoing: true,
          role: 'Dad',
          slug: 'show-106',
          startYear: 2020,
          weight: 2,
        },
      ],
      upcoming: [
        {
          episodeCount: 1,
          id: 105,
          name: 'Show 105',
          role: 'Lead',
          slug: 'show-105',
          state: 'in-development',
        },
      ],
    });
  });

  it('draws breaks: the years a show aired, a December premiere runs on', async () => {
    onTmdb('/person/1/tv_credits', {
      cast: [
        castCredit({
          character: 'A',
          episode_count: 20,
          first_air_date: '2020-12-01',
          id: 300,
        }),
        castCredit({
          character: 'B',
          episode_count: 20,
          first_air_date: '2018-03-01',
          id: 301,
        }),
        castCredit({
          character: 'C',
          episode_count: 20,
          first_air_date: '2024-02-01',
          id: 302,
        }),
      ],
    });
    onTmdb('/tv/300', {
      first_air_date: '2020-12-01',
      id: 300,
      last_air_date: '2023-01-15',
      seasons: [
        { air_date: '2019-01-01', episode_count: 5, season_number: 0 },
        { air_date: '2020-12-01', episode_count: 8, season_number: 1 },
        { air_date: '2023-01-15', episode_count: 8, season_number: 2 },
        { air_date: '2025-01-15', episode_count: 0, season_number: 3 },
        { air_date: null, episode_count: 8, season_number: 4 },
      ],
      status: 'Ended',
    });
    onTmdb('/tv/301', {
      first_air_date: '2018-03-01',
      id: 301,
      last_air_date: '2019-04-01',
      status: 'Ended',
    });
    onTmdb('/tv/302', {
      first_air_date: '2024-02-01',
      id: 302,
      last_air_date: '2024-06-01',
      seasons: [{ air_date: '2024-02-01', episode_count: 8, season_number: 1 }],
      status: 'Returning Series',
    });

    const body = (await (await request('/person/1/career')).json()) as {
      rows: Array<{ id: number; years?: number[] }>;
    };
    const years = (id: number) => body.rows.find((row) => row.id === id);

    expect(years(300)?.years).toEqual([2020, 2021, 2023]);
    expect(years(301)).not.toHaveProperty('years');
    expect(years(302)?.years).toEqual([2024, 2025, 2026]);
  });

  it('stores the career fresh for 30 days', async () => {
    setup();
    await request('/person/1/career');

    const cached = db
      .dump('Cache')
      .find((item) => item.pk === 'CACHE#person-career:v3:1');

    expect(cached).toBeDefined();
    expect(
      (JSON.parse(String(cached?.value)) as { freshUntil: number }).freshUntil,
    ).toBeCloseTo(Date.now() + 30 * 24 * 60 * 60 * 1000, -3);
  });

  it('answers from the cache table when it has the career', async () => {
    const career = { guest: { count: 0, ticks: [] }, rows: [], upcoming: [] };
    db.seed('Cache', [
      {
        pk: 'CACHE#person-career:v3:77',
        value: JSON.stringify({
          freshUntil: Date.now() + 60_000,
          value: career,
        }),
      },
    ]);

    const response = await request('/person/77/career');

    expect(await response.json()).toEqual(career);
  });

  it('404s for an unknown person', async () => {
    const response = await request('/person/999/career');

    expect(response.status).toBe(404);
  });
});

describe('frequent collaborators', () => {
  const aggregate = (
    cast: Array<Record<string, unknown>>,
    crew: Array<Record<string, unknown>> = [],
  ) => ({ cast, crew });
  const actor = (id: number, name: string, episodes = 10) => ({
    id,
    name,
    profile_path: `/face${id}.jpg`,
    roles: [{ character: 'Someone', episode_count: episodes }],
    total_episode_count: episodes,
  });
  const crewMember = (id: number, name: string, job: string, episodes = 1) => ({
    id,
    jobs: [{ episode_count: episodes, job }],
    name,
    profile_path: `/face${id}.jpg`,
    total_episode_count: episodes,
  });

  const setup = () => {
    onTmdb('/person/1/tv_credits', {
      cast: [
        castCredit({ character: 'Lead', episode_count: 60, id: 200 }),
        castCredit({ character: 'Lead', episode_count: 40, id: 201 }),
        castCredit({ character: 'Lead', episode_count: 20, id: 202 }),
        castCredit({ character: 'Himself', episode_count: 5, id: 203 }),
      ],
    });
    onTmdb(
      '/tv/200/aggregate_credits',
      aggregate(
        [actor(1, 'The Person', 60), actor(5, 'Anna', 60), actor(6, 'Bob')],
        [crewMember(7, 'Dirk', 'Director', 5), crewMember(8, 'Once', 'Editor')],
      ),
    );
    onTmdb(
      '/tv/201/aggregate_credits',
      aggregate(
        [actor(5, 'Anna', 30), actor(6, 'Bob', 8)],
        [
          crewMember(7, 'Dirk', 'Writer', 3),
          crewMember(6, 'Bob', 'Producer', 2),
        ],
      ),
    );
    onTmdb('/tv/202/aggregate_credits', aggregate([actor(5, 'Anna', 5)]));
    onTmdb(
      '/tv/203/aggregate_credits',
      aggregate([actor(9, 'Talk Host'), actor(5, 'Anna')]),
    );
  };

  it('ranks the people who share most shows, never the person himself', async () => {
    setup();

    const response = await request('/person/1/collaborators');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('public');
    expect(await response.json()).toEqual({
      collaborators: [
        {
          character: 'Someone',
          count: 3,
          episodeCount: 95,
          id: 5,
          image: expect.stringContaining('/face5.jpg'),
          name: 'Anna',
          role: 'Actor',
          showIds: [200, 201, 202],
          slug: 'anna',
        },
        {
          character: 'Someone',
          count: 2,
          episodeCount: 18,
          id: 6,
          image: expect.stringContaining('/face6.jpg'),
          name: 'Bob',
          role: 'Actor',
          showIds: [200, 201],
          slug: 'bob',
        },
        {
          count: 2,
          episodeCount: 8,
          id: 7,
          image: expect.stringContaining('/face7.jpg'),
          name: 'Dirk',
          role: 'Director',
          showIds: [200, 201],
          slug: 'dirk',
        },
      ],
    });
  });

  it('captions an actor with their biggest character, never a self credit or crew work', async () => {
    onTmdb('/person/3/tv_credits', {
      cast: [
        castCredit({ character: 'Lead', episode_count: 10, id: 300 }),
        castCredit({ character: 'Lead', episode_count: 10, id: 301 }),
      ],
    });
    const roles = (...pairs: Array<[string, number]>) =>
      pairs.map(([character, episode_count]) => ({ character, episode_count }));
    onTmdb(
      '/tv/300/aggregate_credits',
      aggregate(
        [
          {
            ...actor(11, 'Lois Actor'),
            roles: roles(['Lois', 30], ['Nurse', 2]),
          },
          { ...actor(12, 'Host'), roles: roles(['Himself', 40]) },
        ],
        [crewMember(13, 'Crew Only', 'Writer')],
      ),
    );
    onTmdb(
      '/tv/301/aggregate_credits',
      aggregate(
        [
          { ...actor(11, 'Lois Actor'), roles: roles(['Lois', 5]) },
          { ...actor(12, 'Host'), roles: roles(['Self', 3], ['Judge', 1]) },
        ],
        [crewMember(13, 'Crew Only', 'Writer')],
      ),
    );

    const body = (await (await request('/person/3/collaborators')).json()) as {
      collaborators: Array<{ name: string; character?: string; role: string }>;
    };
    const byName = Object.fromEntries(
      body.collaborators.map((person) => [person.name, person]),
    );

    expect(byName['Lois Actor']?.character).toBe('Lois');
    expect(byName.Host?.character).toBe('Judge');
    expect(byName['Crew Only']).not.toHaveProperty('character');
    expect(byName['Crew Only']?.role).toBe('Writer');
  });

  it('stores the result fresh for 30 days', async () => {
    setup();
    await request('/person/1/collaborators');

    const cached = db
      .dump('Cache')
      .find((item) => item.pk === 'CACHE#person-collaborators:v3:1');

    expect(
      (JSON.parse(String(cached?.value)) as { freshUntil: number }).freshUntil,
    ).toBeCloseTo(Date.now() + 30 * 24 * 60 * 60 * 1000, -3);
  });

  it('only looks at his 15 biggest shows', async () => {
    onTmdb('/person/2/tv_credits', {
      cast: Array.from({ length: 16 }, (_, index) =>
        castCredit({
          character: 'Lead',
          episode_count: 100 - index,
          id: 300 + index,
        }),
      ),
    });
    // Zed is in all 16: the 16th (smallest) show is never read, so count 15
    for (let index = 0; index < 16; index++) {
      onTmdb(
        `/tv/${300 + index}/aggregate_credits`,
        aggregate([actor(50, 'Zed'), actor(51 + index, `Other ${index}`)]),
      );
    }

    const response = await request('/person/2/collaborators');
    const { collaborators } = (await response.json()) as {
      collaborators: Array<{ id: number; count: number }>;
    };

    expect(collaborators).toEqual([
      expect.objectContaining({ count: 15, id: 50 }),
    ]);
  });

  it('is empty when nobody works with him twice', async () => {
    onTmdb('/person/3/tv_credits', {
      cast: [castCredit({ character: 'Lead', id: 400 })],
    });
    onTmdb('/tv/400/aggregate_credits', aggregate([actor(5, 'Anna')]));

    const response = await request('/person/3/collaborators');

    expect(await response.json()).toEqual({ collaborators: [] });
  });

  it('404s for an unknown person', async () => {
    const response = await request('/person/999/collaborators');

    expect(response.status).toBe(404);
  });
});

describe('family and awards (Wikidata)', () => {
  const SPARQL = 'https://query.wikidata.org/sparql';
  const ENTITY = 'http://www.wikidata.org/entity/';

  const bind = (fields: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        { type: 'literal', value },
      ]),
    );
  const spouse = (
    id: string,
    label: string,
    extra: Record<string, string> = {},
  ) =>
    bind({
      item: `${ENTITY}${id}`,
      itemLabel: label,
      kind: 'spouse',
      ...extra,
    });
  const child = (id: string, label: string, sex?: string, tmdb?: string) =>
    bind({
      item: `${ENTITY}${id}`,
      itemLabel: label,
      kind: 'child',
      ...(sex && { sex: `${ENTITY}${sex}` }),
      ...(tmdb && { tmdb }),
    });
  const award = (
    kind: 'won' | 'nominated',
    label: string,
    year?: string,
    work?: string,
  ) =>
    bind({
      item: `${ENTITY}Q${Math.abs(hash(`${label}${year}${work}`))}`,
      itemLabel: label,
      kind,
      ...(year && { year }),
      ...(work && { workLabel: work }),
    });
  const hash = (text: string) =>
    [...text].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) % 1e6;

  const withPerson = (imdbId: string | null = 'nm0186505') => {
    onTmdb('/person/17419', { id: 17419, imdb_id: imdbId, name: 'Bryan' });
  };
  const withRows = (rows: unknown[]) =>
    onGet(SPARQL, { results: { bindings: rows } });

  it('returns spouses, children and awards grouped by family', async () => {
    withPerson();
    withRows([
      spouse('Q11', 'Robin Dearden', { start: '1989-01-01T00:00:00Z' }),
      spouse('Q12', 'Mickey Middleton', {
        end: '1989-01-01T00:00:00Z',
        start: '1977-01-01T00:00:00Z',
      }),
      child('Q21', 'Taylor Dearden', 'Q6581072'),
      child('Q22', 'Sam Son', 'Q6581097'),
      child('Q23', 'Pat Other'),
      child('Q99999999', 'Q99999999'),
      award(
        'won',
        'Primetime Emmy Award for Outstanding Lead Actor in a Drama Series',
        '2014-01-01T00:00:00Z',
        'Breaking Bad',
      ),
      award('won', 'Primetime Emmy Award for Outstanding Guest Actor'),
      award(
        'won',
        'Tony Award for Best Actor in a Play',
        '2014-01-01T00:00:00Z',
      ),
      award(
        'nominated',
        'Primetime Emmy Award for Outstanding Lead Actor in a Drama Series',
        '2014-01-01T00:00:00Z',
        'Breaking Bad',
      ),
      award(
        'nominated',
        'Golden Globe Award for Best Actor',
        '2010-01-01T00:00:00Z',
      ),
      award('nominated', 'Saturn Award for Best Actor on Television'),
      award('nominated', 'Mystery Prize for Great Work'),
    ]);

    const response = await request('/person/17419/family-and-awards');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('public');
    expect(await response.json()).toEqual({
      awards: {
        groups: [
          { name: 'Emmy', nominations: 0, wins: 2 },
          { name: 'Tony', nominations: 0, wins: 1 },
          { name: 'Golden Globe', nominations: 1, wins: 0 },
          { name: 'Mystery Prize', nominations: 1, wins: 0 },
          { name: 'Saturn', nominations: 1, wins: 0 },
        ],
        items: expect.arrayContaining([
          {
            award:
              'Primetime Emmy Award for Outstanding Lead Actor in a Drama Series',
            group: 'Emmy',
            won: true,
            work: 'Breaking Bad',
            year: 2014,
          },
          {
            award: 'Saturn Award for Best Actor on Television',
            group: 'Saturn',
            won: false,
          },
        ]),
        nominations: 3,
        total: 6,
        wins: 3,
      },
      family: {
        children: [
          { id: 'Q21', name: 'Taylor Dearden', relation: 'daughter' },
          { id: 'Q22', name: 'Sam Son', relation: 'son' },
          { id: 'Q23', name: 'Pat Other', relation: 'child' },
        ],
        spouses: [
          {
            endYear: 1989,
            id: 'Q12',
            name: 'Mickey Middleton',
            startYear: 1977,
          },
          { id: 'Q11', name: 'Robin Dearden', startYear: 1989 },
        ],
      },
    });
  });

  it('links a child to their person page only when TMDB knows them', async () => {
    withPerson();
    // TMDB's own name gives the slug (the person page's canonical one)
    onTmdb('/person/1234', { id: 1234, name: 'Taylor Dearden Cranston' });
    withRows([
      child('Q21', 'Taylor Dearden', 'Q6581072', 'abc'),
      child('Q21', 'Taylor Dearden', 'Q6581072', '1234'),
      child('Q21', 'Taylor Dearden', 'Q6581072', '5678'),
      child('Q22', 'Sam Son', 'Q6581097'),
      child('Q23', 'Pat Other', undefined, 'not-a-number'),
    ]);

    const response = await request('/person/17419/family-and-awards');

    const body = (await response.json()) as {
      family: { children: unknown[] };
    };
    expect(body.family.children).toEqual([
      {
        id: 'Q21',
        name: 'Taylor Dearden',
        relation: 'daughter',
        slug: 'taylor-dearden-cranston',
        tmdbId: 1234,
      },
      { id: 'Q22', name: 'Sam Son', relation: 'son' },
      { id: 'Q23', name: 'Pat Other', relation: 'child' },
    ]);
  });

  it('leaves a child unlinked when TMDB does not know the id', async () => {
    withPerson();
    onTmdb('/person/4321', null, { status: 404 });
    withRows([child('Q31', 'Kim Kid', 'Q6581097', '4321')]);

    const response = await request('/person/17419/family-and-awards');

    const body = (await response.json()) as {
      family: { children: unknown[] };
    };
    expect(body.family.children).toEqual([
      { id: 'Q31', name: 'Kim Kid', relation: 'son' },
    ]);
  });

  it('asks Wikidata for the TMDB id of spouses as well as children', async () => {
    withPerson();
    withRows([]);

    await request('/person/17419/family-and-awards');

    const query =
      requestedUrls()
        .find((url) => url.host === 'query.wikidata.org')
        ?.searchParams.get('query') ?? '';
    const branches = query.split('} UNION {');
    const spouseBranch = branches.find((part) => part.includes('"spouse"'));
    const childBranch = branches.find((part) => part.includes('"child"'));
    expect(spouseBranch).toContain('OPTIONAL { ?item wdt:P4985 ?tmdb. }');
    expect(childBranch).toContain('OPTIONAL { ?item wdt:P4985 ?tmdb. }');
  });

  it('links a spouse to their person page only when TMDB knows them', async () => {
    withPerson();
    onTmdb('/person/1234', { id: 1234, name: 'Robin Dearden Cranston' });
    const married = { start: '1989-01-01T00:00:00Z' };
    withRows([
      spouse('Q11', 'Robin Dearden', { ...married, tmdb: 'abc' }),
      spouse('Q11', 'Robin Dearden', { ...married, tmdb: '1234' }),
      spouse('Q11', 'Robin Dearden', { ...married, tmdb: '5678' }),
      spouse('Q12', 'Mickey Middleton', {
        end: '1982-01-01T00:00:00Z',
        start: '1977-01-01T00:00:00Z',
      }),
    ]);

    const response = await request('/person/17419/family-and-awards');

    const body = (await response.json()) as {
      family: { spouses: unknown[] };
    };
    expect(body.family.spouses).toEqual([
      { endYear: 1982, id: 'Q12', name: 'Mickey Middleton', startYear: 1977 },
      {
        id: 'Q11',
        name: 'Robin Dearden',
        slug: 'robin-dearden-cranston',
        startYear: 1989,
        tmdbId: 1234,
      },
    ]);
  });

  it('shows only what is present: no family, no awards', async () => {
    withPerson();
    withRows([award('won', 'Tony Award for Best Actor in a Play')]);

    const response = await request('/person/17419/family-and-awards');
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.family).toBeNull();
    expect(body.awards).toMatchObject({ total: 1, wins: 1 });
  });

  it('caches a hit for 7 days', async () => {
    withPerson();
    withRows([spouse('Q11', 'Robin Dearden')]);

    await request('/person/17419/family-and-awards');

    const cached = db
      .dump('Cache')
      .find((item) => item.pk === 'CACHE#wikidata-person:v3:nm0186505');
    expect(cached?.expiresAt).toBe(
      Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    );
  });

  it('caches "nothing on Wikidata" for 1 day', async () => {
    withPerson();
    withRows([]);

    const response = await request('/person/17419/family-and-awards');

    expect(await response.json()).toEqual({ awards: null, family: null });
    const cached = db
      .dump('Cache')
      .find((item) => item.pk === 'CACHE#wikidata-person:v3:nm0186505');
    expect(cached?.expiresAt).toBe(
      Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    );
  });

  it('never fails when Wikidata is down, and does not cache that', async () => {
    withPerson();
    onGet(SPARQL, { error: 'down' }, { status: 503 });

    const response = await request('/person/17419/family-and-awards');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      awards: null,
      degraded: true,
      family: null,
    });
    // The person's details are stored (shared by three routes); Wikidata's
    // outage is not
    expect(
      db.dump('Cache').filter((item) => String(item.pk).includes('wikidata')),
    ).toEqual([]);
  });

  it('has nothing for a person without an IMDb id', async () => {
    withPerson(null);

    const response = await request('/person/17419/family-and-awards');

    expect(await response.json()).toEqual({ awards: null, family: null });
  });

  it('404s for an unknown person', async () => {
    const response = await request('/person/999/family-and-awards');

    expect(response.status).toBe(404);
  });
});
