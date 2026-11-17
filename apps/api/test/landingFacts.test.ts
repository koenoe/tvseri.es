import { NETWORKS } from '@tvseri.es/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { onTmdb, resetHttp } from './fakeHttp';
import { request } from './request';

// Fixed "today": the "last 12 months" window is 2025-11-12 to 2026-11-12
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
});

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

/** The most popular shows of a query (the default vote floor of 1) */
const popular = (query: Record<string, string>, ids: number[]) => {
  // page 2 is empty
  onTmdb(
    '/discover/tv',
    { page: 2, results: [], total_pages: 1, total_results: ids.length },
    {
      exact: true,
      query: {
        ...DISCOVER_DEFAULTS,
        ...query,
        page: '2',
        'vote_count.gte': '1',
      },
    },
  );
  onTmdb(
    '/discover/tv',
    {
      page: 1,
      results: ids.map((id) => ({
        id,
        name: `Show ${id}`,
        poster_path: '/p.jpg',
      })),
      total_pages: 1,
      total_results: ids.length,
    },
    {
      exact: true,
      query: { ...DISCOVER_DEFAULTS, ...query, 'vote_count.gte': '1' },
    },
  );
};

const keywordsOf = (id: number, keywords: Array<[number, string]>) =>
  onTmdb(`/tv/${id}/keywords`, {
    id,
    results: keywords.map(([keywordId, name]) => ({ id: keywordId, name })),
  });

const genreList = (genres: Array<[number, string]>) =>
  onTmdb('/genre/tv/list', {
    genres: genres.map(([id, name]) => ({ id, name })),
  });

const facts = async (path: string) => {
  const response = await request(`/discover/landing/${path}/facts`);
  expect(response.status).toBe(200);
  return response.json();
};

describe('genre facts', () => {
  it('counts shows, shared genres, the peak decade, new shows, and sub-genres', async () => {
    genreList([
      [80, 'Crime'],
      [18, 'Drama'],
      [9648, 'Mystery'],
      [35, 'Comedy'],
    ]);
    count({ with_genres: '80' }, 1000);
    count({ with_genres: '80,18' }, 710);
    count({ with_genres: '80,9648' }, 300);
    count({ with_genres: '80,35' }, 100);
    for (const decade of ['1950', '1960', '1970', '1980', '1990', '2020']) {
      count(
        {
          'first_air_date.gte': `${decade}-01-01`,
          'first_air_date.lte': `${Number(decade) + 9}-12-31`,
          with_genres: '80',
        },
        0,
      );
    }
    count(
      {
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
        with_genres: '80',
      },
      400,
    );
    count(
      {
        'first_air_date.gte': '2000-01-01',
        'first_air_date.lte': '2009-12-31',
        with_genres: '80',
      },
      200,
    );
    count(
      {
        'first_air_date.gte': '2025-11-12',
        'first_air_date.lte': '2026-11-12',
        with_genres: '80',
      },
      55,
    );
    popular({ with_genres: '80' }, [101, 102, 103]);
    keywordsOf(101, [
      [703, 'detective'],
      [10714, 'serial killer'],
      [323114, 'crime'],
    ]);
    keywordsOf(102, [
      [703, 'detective'],
      [6149, 'police'],
    ]);
    keywordsOf(103, [
      [703, 'detective'],
      [10714, 'serial killer'],
      [5, 'not a landing theme'],
    ]);
    // each theme counted over its whole keyword set
    count({ with_genres: '80', with_keywords: '703|155790' }, 300);
    count({ with_genres: '80', with_keywords: '10714' }, 120);
    count(
      { with_genres: '80', with_keywords: '6149|268067|1812|15167|272551' },
      8,
    );

    // named as the theme list names them; the id is the theme's strongest
    const kinds = [
      { count: 300, id: 703, name: 'Detectives', slug: 'detectives' },
      { count: 120, id: 10714, name: 'Serial killers', slug: 'serial-killers' },
    ];
    const response = await request('/discover/landing/genre/crime/facts');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('max-age=604800');
    expect(await response.json()).toEqual({
      alsoWith: [
        { count: 710, id: 18, name: 'Drama', percent: 71, slug: 'drama' },
        { count: 300, id: 9648, name: 'Mystery', percent: 30, slug: 'mystery' },
        { count: 100, id: 35, name: 'Comedy', percent: 10, slug: 'comedy' },
      ],
      byKind: kinds, // the police chip has 8 shows: no tab
      count: 1000,
      newLastYear: 55,
      peakDecade: { count: 400, slug: '2010s' },
      slug: 'crime',
      subGenres: [
        ...kinds,
        { count: 8, id: 6149, name: 'Police', slug: 'police' },
      ],
      type: 'genre',
    });
  });

  it('has no peak decade and no chips for a genre without shows', async () => {
    genreList([[80, 'Crime']]);
    count({ with_genres: '37' }, 0);
    expect(await facts('genre/western')).toEqual({
      alsoWith: [],
      byKind: [],
      count: 0,
      newLastYear: 0,
      peakDecade: null,
      slug: 'western',
      subGenres: [],
      type: 'genre',
    });
  });
});

describe('genre facts at TMDB’s count cap', () => {
  it('has no peak decade when the peak decade’s count is capped (a floor, not a number)', async () => {
    genreList([[18, 'Drama']]);
    count({ with_genres: '18' }, 20_001);
    for (const decade of [
      '1950',
      '1960',
      '1970',
      '1980',
      '1990',
      '2000',
      '2010',
      '2020',
    ]) {
      count(
        {
          'first_air_date.gte': `${decade}-01-01`,
          'first_air_date.lte': `${Number(decade) + 9}-12-31`,
          with_genres: '18',
        },
        decade === '2020' ? 20_001 : 900,
      );
    }
    count(
      {
        'first_air_date.gte': '2025-11-12',
        'first_air_date.lte': '2026-11-12',
        with_genres: '18',
      },
      3288,
    );
    popular({ with_genres: '18' }, []);

    expect(await facts('genre/drama')).toMatchObject({
      count: 20_001,
      newLastYear: 3288,
      peakDecade: null,
    });
  });
});

describe('genre facts for a genre TMDB keeps as a keyword', () => {
  it('counts Horror by its keyword, and its themes by their strongest keyword', async () => {
    genreList([
      [18, 'Drama'],
      [10765, 'Sci-Fi & Fantasy'],
    ]);
    const horror = { with_keywords: '315058' };
    count(horror, 500);
    count({ ...horror, with_genres: '18' }, 250);
    count({ ...horror, with_genres: '10765' }, 100);
    for (const decade of [
      '1950',
      '1960',
      '1970',
      '1980',
      '1990',
      '2000',
      '2010',
      '2020',
    ]) {
      count(
        {
          ...horror,
          'first_air_date.gte': `${decade}-01-01`,
          'first_air_date.lte': `${Number(decade) + 9}-12-31`,
        },
        decade === '2010' ? 200 : 10,
      );
    }
    count(
      {
        ...horror,
        'first_air_date.gte': '2025-11-12',
        'first_air_date.lte': '2026-11-12',
      },
      40,
    );
    popular(horror, [301]);
    keywordsOf(301, [
      [315058, 'horror'],
      [3358, 'haunted house'],
      [3133, 'vampire'],
    ]);
    // a keyword genre and a theme: one keyword each, never `,` and `|` mixed
    count({ with_keywords: '315058,162846' }, 30);
    count({ with_keywords: '315058,3133' }, 20);

    expect(await facts('genre/horror')).toEqual({
      alsoWith: [
        { count: 250, id: 18, name: 'Drama', percent: 50, slug: 'drama' },
        {
          count: 100,
          id: 10765,
          name: 'Sci-Fi & Fantasy',
          percent: 20,
          slug: 'sci-fi-fantasy',
        },
      ],
      byKind: [
        { count: 30, id: 162846, name: 'Ghosts', slug: 'ghosts' },
        { count: 20, id: 3133, name: 'Vampires', slug: 'vampires' },
      ],
      count: 500,
      newLastYear: 40,
      peakDecade: { count: 200, slug: '2010s' },
      slug: 'horror',
      subGenres: [
        { count: 30, id: 162846, name: 'Ghosts', slug: 'ghosts' },
        { count: 20, id: 3133, name: 'Vampires', slug: 'vampires' },
      ],
      type: 'genre',
    });
  });
});

describe('theme facts', () => {
  it('counts shows, top genres, co-tagged themes and next-door themes over keyword sets', async () => {
    genreList([
      [10765, 'Sci-Fi & Fantasy'],
      [18, 'Drama'],
      [80, 'Crime'],
    ]);
    const dystopia = { with_keywords: '4565|12190|178712' };
    count(dystopia, 146);
    count({ ...dystopia, with_genres: '10765' }, 100);
    count({ ...dystopia, with_genres: '18' }, 60);
    count({ ...dystopia, with_genres: '80' }, 10);
    popular(dystopia, [201, 202]);
    keywordsOf(201, [
      [4565, 'dystopia'],
      // cyberpunk is dystopia's own: never its chip
      [12190, 'cyberpunk'],
      [4379, 'time travel'],
      [5455, 'time machine'],
    ]);
    keywordsOf(202, [
      [178712, 'totalitarianism'],
      [818, 'based on novel or book'],
      [6078, 'politics'],
      [10854, 'time loop'],
    ]);
    // "Often tagged with": both themes, by their strongest keywords
    count({ with_keywords: '4565,4379' }, 40);
    count({ with_keywords: '4565,6078' }, 15);
    // "Next door": that theme's whole set, without dystopia's strongest
    count({ with_keywords: '4379|5455|10854', without_keywords: '4565' }, 410);
    count({ with_keywords: '6078|41282|209817', without_keywords: '4565' }, 8);

    const timeTravel = { id: 4379, name: 'Time travel', slug: 'time-travel' };
    expect(await facts('theme/dystopia')).toEqual({
      count: 146,
      nextDoor: [{ ...timeTravel, count: 410 }],
      oftenTaggedWith: [
        { ...timeTravel, count: 40 },
        { count: 15, id: 6078, name: 'Politics', slug: 'politics' },
      ],
      slug: 'dystopia',
      topGenres: [
        {
          count: 100,
          id: 10765,
          name: 'Sci-Fi & Fantasy',
          percent: 68,
          slug: 'sci-fi-fantasy',
        },
        { count: 60, id: 18, name: 'Drama', percent: 41, slug: 'drama' },
      ],
      type: 'theme',
    });
  });

  it('keeps a genre-bound theme to its genre', async () => {
    genreList([
      [18, 'Drama'],
      [35, 'Comedy'],
    ]);
    const medical = { with_genres: '18', with_keywords: '208788|11612' };
    count(medical, 50);
    count({ ...medical, with_genres: '18,35' }, 5);
    popular(medical, []);

    expect(await facts('theme/medical-dramas')).toEqual({
      count: 50,
      nextDoor: [],
      oftenTaggedWith: [],
      slug: 'medical-dramas',
      topGenres: [
        { count: 50, id: 18, name: 'Drama', percent: 100, slug: 'drama' },
        { count: 5, id: 35, name: 'Comedy', percent: 10, slug: 'comedy' },
      ],
      type: 'theme',
    });
  });

  it('has no facts for a retired theme', async () => {
    const response = await request('/discover/landing/theme/heist/facts');
    expect(response.status).toBe(404);
  });
});

const fakeNetworkShows = () => {
  popular({ with_networks: '49' }, [1, 2, 3]);
  onTmdb('/tv/1', {
    id: 1,
    name: 'A',
    networks: [{ id: 49, name: 'HBO' }],
    poster_path: '/a.jpg',
  });
  onTmdb('/tv/2', {
    id: 2,
    name: 'B',
    networks: [
      { id: 999, name: 'Other' },
      { id: 49, name: 'HBO' },
    ],
    poster_path: '/b.jpg',
  });
  onTmdb('/tv/3', {
    id: 3,
    name: 'C',
    networks: [{ id: 49, name: 'HBO' }],
    poster_path: '/c.jpg',
  });
};

describe('network facts', () => {
  it('picks decades for a network that spans them, and finds its originals', async () => {
    count({ with_networks: '49' }, 381);
    count({ 'first_air_date.lte': '2009-12-31', with_networks: '49' }, 90);
    count(
      {
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
        with_networks: '49',
      },
      140,
    );
    count({ 'first_air_date.gte': '2020-01-01', with_networks: '49' }, 151);
    fakeNetworkShows();

    const body = await facts('network/hbo');

    expect(body.bestBy).toEqual({
      kind: 'decades',
      options: [
        {
          count: 90,
          filter: { 'first_air_date.lte': '2009-12-31' },
          key: 'before-2010',
          label: 'Before 2010',
        },
        {
          count: 140,
          filter: {
            'first_air_date.gte': '2010-01-01',
            'first_air_date.lte': '2019-12-31',
          },
          key: '2010s',
          label: '2010s',
        },
        {
          count: 151,
          filter: { 'first_air_date.gte': '2020-01-01' },
          key: '2020s',
          label: '2020s',
        },
      ],
    });
    expect(body.count).toBe(381);
    expect(body.originals).toMatchObject({
      exact: false,
      found: 2,
      scanned: 3,
    });
    expect(body.originals.items.map((item: { id: number }) => item.id)).toEqual(
      [1, 3],
    );
  });

  it('is exact when every show was scanned', async () => {
    count({ with_networks: '49' }, 3);
    const eras: Array<Record<string, string>> = [
      { 'first_air_date.lte': '2009-12-31' },
      {
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
      },
      { 'first_air_date.gte': '2020-01-01' },
    ];
    for (const era of eras) {
      count({ with_networks: '49', ...era }, 0);
    }
    genreList([[18, 'Drama']]);
    count({ with_genres: '18', with_networks: '49' }, 0);
    fakeNetworkShows();

    const body = await facts('network/hbo');

    expect(body.originals).toMatchObject({ exact: true, found: 2, scanned: 3 });
  });

  it('picks genres (6+ shows each, biggest first) for a network of one era', async () => {
    count({ with_networks: '2552' }, 600);
    count({ 'first_air_date.gte': '2020-01-01', with_networks: '2552' }, 590);
    genreList([
      [18, 'Drama'],
      [35, 'Comedy'],
      [80, 'Crime'],
    ]);
    count({ with_genres: '18', with_networks: '2552' }, 200);
    count({ with_genres: '35', with_networks: '2552' }, 5);
    count({ with_genres: '80', with_networks: '2552' }, 60);

    const body = await facts('network/apple-tv');

    expect(body.bestBy).toEqual({
      kind: 'genres',
      options: [
        {
          count: 200,
          filter: { with_genres: '18' },
          key: 'drama',
          label: 'Drama',
        },
        {
          count: 60,
          filter: { with_genres: '80' },
          key: 'crime',
          label: 'Crime',
        },
      ],
    });
  });
});

/** No shows for any network, to be overridden by the test (TMDB answers 200 with 0) */
const noNetworkShows = (country: string) => {
  for (const network of NETWORKS) {
    count(
      { with_networks: String(network.id), with_origin_country: country },
      0,
    );
  }
};

describe('country facts', () => {
  it('lists the networks with most shows made there, 12 or more', async () => {
    noNetworkShows('GB');
    count({ with_origin_country: 'GB' }, 7240);
    count({ with_networks: '4', with_origin_country: 'GB' }, 500);
    count({ with_networks: '9', with_origin_country: 'GB' }, 300);
    count({ with_networks: '26', with_origin_country: 'GB' }, 200);
    count({ with_networks: '332', with_origin_country: 'GB' }, 5);

    expect(await facts('country/gb')).toEqual({
      count: 7240,
      madeFor: [
        { count: 500, id: 4, name: 'BBC One', slug: 'bbc-one' },
        { count: 300, id: 9, name: 'ITV1', slug: 'itv1' },
        { count: 200, id: 26, name: 'Channel 4', slug: 'channel-4' },
      ],
      slug: 'gb',
      type: 'country',
    });
  });

  it('hides the switch when fewer than 3 networks qualify', async () => {
    noNetworkShows('DK');
    count({ with_origin_country: 'DK' }, 900);
    count({ with_networks: '391', with_origin_country: 'DK' }, 80);
    count({ with_networks: '196', with_origin_country: 'DK' }, 40);

    expect((await facts('country/dk')).madeFor).toEqual([]);
  });
});

describe('decade and language facts', () => {
  it('count the shows', async () => {
    count(
      {
        'first_air_date.gte': '2010-01-01',
        'first_air_date.lte': '2019-12-31',
      },
      41800,
    );
    count({ with_original_language: 'ja' }, 16900);

    expect(await facts('decade/2010s')).toEqual({
      count: 41800,
      slug: '2010s',
      type: 'decade',
    });
    expect(await facts('language/ja')).toEqual({
      count: 16900,
      slug: 'ja',
      type: 'language',
    });
  });
});

describe('caching and unknown landings', () => {
  it('serves a repeat from the Cache table without asking TMDB', async () => {
    count({ with_original_language: 'ja' }, 16900);
    await request('/discover/landing/language/ja/facts');

    resetHttp();
    const response = await request('/discover/landing/language/ja/facts');

    expect(await response.json()).toEqual({
      count: 16900,
      slug: 'ja',
      type: 'language',
    });
  });

  it('answers a cached 404 for a slug that is not a landing', async () => {
    const response = await request('/discover/landing/genre/not-a-genre/facts');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toContain('max-age=604800');
  });

  it('answers 404 for an unknown landing type', async () => {
    const response = await request('/discover/landing/planet/mars/facts');
    expect(response.status).toBe(404);
  });
});
