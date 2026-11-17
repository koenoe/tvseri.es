import type { NewThisWeek } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { freshHoursLeft, storedRows } from './cacheRows';
import {
  onTmdb,
  requestedUrls,
  resetRequests,
  setUpstreamConditions,
} from './fakeHttp';
import { request } from './request';

/**
 * Home's "New this week": what premiered (a new series or a new season) in
 * the week up to the day, today included, most popular first, the lead
 * (the highest-ranked with a backdrop) first.
 */

const TODAY = '2026-11-14';

const show = (id: number, extra: Record<string, unknown> = {}) => ({
  backdrop_path: `/b${id}.jpg`,
  first_air_date: '2020-01-01',
  genre_ids: [18],
  id,
  name: `Show ${id}`,
  popularity: 10,
  poster_path: `/p${id}.jpg`,
  vote_count: 100,
  ...extra,
});

const season = (n: number, airDate: string, count = 8) => ({
  air_date: airDate,
  episode_count: count,
  id: n,
  name: `Season ${n}`,
  season_number: n,
});

const details = (
  id: number,
  seasons: ReadonlyArray<ReturnType<typeof season>>,
) => ({ ...show(id), seasons, status: 'Returning Series' });

const fetchNewThisWeek = async (date = TODAY) => {
  const response = await request(`/home/new-this-week?date=${date}`);
  return {
    body: (await response.json()) as NewThisWeek,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

const ids = (body: NewThisWeek) => body.items.map((item) => item.series.id);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`));

  onTmdb('/genre/tv/list', {
    genres: [
      { id: 18, name: 'Drama' },
      { id: 10765, name: 'Sci-Fi & Fantasy' },
    ],
  });

  // New series: the window is 2026-11-07 (7 days ago) to today
  onTmdb(
    '/discover/tv',
    {
      results: [
        // 7 days ago: in
        show(6, { first_air_date: '2026-11-07', popularity: 50 }),
        show(1, {
          first_air_date: '2026-11-10',
          genre_ids: [10765],
          popularity: 300,
        }),
        // the most popular, but without a backdrop: it can't lead
        show(11, {
          backdrop_path: null,
          first_air_date: '2026-11-13',
          popularity: 900,
        }),
        // 8 days ago and tomorrow: out (TMDB's own filter aside)
        show(7, { first_air_date: '2026-11-06', popularity: 500 }),
        show(8, { first_air_date: '2026-11-15', popularity: 400 }),
        // no poster: the row can't draw it
        show(10, {
          first_air_date: '2026-11-12',
          popularity: 250,
          poster_path: null,
        }),
      ],
    },
    {
      query: {
        'first_air_date.gte': '2026-11-07',
        'first_air_date.lte': TODAY,
      },
    },
  );
  // Shows with an episode in the window: which ones started a season in it
  onTmdb(
    '/discover/tv',
    {
      results: [
        show(2, { first_air_date: '2019-02-01', popularity: 200 }),
        show(3, { popularity: 150 }),
        show(4, { popularity: 120 }),
        show(5, { popularity: 100 }),
        show(1, { first_air_date: '2026-11-10', popularity: 300 }),
      ],
    },
    { query: { 'air_date.gte': '2026-11-07', 'air_date.lte': TODAY } },
  );

  // 2: season 3 started three days ago
  onTmdb(
    '/tv/2',
    details(2, [
      season(1, '2019-02-01'),
      season(2, '2022-03-01'),
      season(3, '2026-11-11'),
    ]),
  );
  // 3: mid-season, the season started last month
  onTmdb('/tv/3', details(3, [season(1, '2026-10-01')]));
  // 4: season 2 starts next week (an episode of season 1 aired this week)
  onTmdb(
    '/tv/4',
    details(4, [season(1, '2026-09-01'), season(2, '2026-11-20')]),
  );
  // 5: season 4 started 8 days ago
  onTmdb(
    '/tv/5',
    details(5, [season(3, '2025-01-01'), season(4, '2026-11-06')]),
  );

  onTmdb('/tv/1/images', {
    logos: [{ file_path: '/logo1.png', iso_639_1: 'en', vote_average: 5 }],
  });
  onTmdb('/tv/2/images', {
    logos: [{ file_path: '/logo2.png', iso_639_1: 'en', vote_average: 5 }],
  });
});

describe('GET /home/new-this-week', () => {
  it('lists the week’s premieres by popularity, the lead (the first with a backdrop) first', async () => {
    const { body, cacheControl, status } = await fetchNewThisWeek();

    expect(status).toBe(200);
    expect(body.date).toBe(TODAY);
    // ranks: 11 (900), 1 (300), 2 (200), 6 (50); 11 has no backdrop
    expect(body.items.map((item) => [item.series.id, item.rank])).toEqual([
      [1, 2],
      [11, 1],
      [2, 3],
      [6, 4],
    ]);
    expect(cacheControl).toContain('s-maxage=');
    expect(cacheControl).not.toBe('public, max-age=300, s-maxage=3600');
  });

  it('tells a new series from a new season, with the premiere’s date', async () => {
    const { body } = await fetchNewThisWeek();

    const byId = new Map(body.items.map((item) => [item.series.id, item]));
    expect(byId.get(1)).toMatchObject({
      date: '2026-11-10',
      kind: 'new-series',
      seasonNumber: 1,
    });
    expect(byId.get(2)).toMatchObject({
      date: '2026-11-11',
      kind: 'new-season',
      seasonNumber: 3,
    });
  });

  it('takes 7 days ago, never 8 days ago or tomorrow', async () => {
    const { body } = await fetchNewThisWeek();

    expect(ids(body)).toContain(6);
    expect(ids(body)).not.toContain(7);
    expect(ids(body)).not.toContain(8);
    // season 4 of show 5 started 8 days ago, season 2 of show 4 next week
    expect(ids(body)).not.toContain(5);
    expect(ids(body)).not.toContain(4);
    // a mid-season episode isn't a premiere
    expect(ids(body)).not.toContain(3);
  });

  it('leaves out a show without a poster', async () => {
    expect(ids((await fetchNewThisWeek()).body)).not.toContain(10);
  });

  it('carries the logo, the backdrop and named genres; no logo is fine', async () => {
    const { body } = await fetchNewThisWeek();

    const lead = body.items[0]!;
    expect(lead.series.titleTreatmentImage).toContain('/logo1.png');
    expect(lead.series.backdropImage).toContain('/b1.jpg');
    expect(lead.series.posterImage).toContain('/p1.jpg');
    expect(lead.series.genres.map((genre) => genre.name)).toEqual([
      'Sci-Fi & Fantasy',
    ]);
    const noLogo = body.items.find((item) => item.series.id === 6);
    expect(noLogo?.series.titleTreatmentImage).toBeFalsy();
  });

  it('holds at most 12, the most popular', async () => {
    onTmdb(
      '/discover/tv',
      {
        results: Array.from({ length: 20 }, (_, i) =>
          show(100 + i, { first_air_date: '2026-11-12', popularity: 100 - i }),
        ),
      },
      { query: { 'first_air_date.gte': '2026-11-07' } },
    );
    onTmdb(
      '/discover/tv',
      { results: [] },
      { query: { 'air_date.gte': '2026-11-07' } },
    );

    const { body } = await fetchNewThisWeek();

    expect(ids(body)).toEqual(Array.from({ length: 12 }, (_, i) => 100 + i));
    expect(body.items.map((item) => item.rank)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
  });

  it('is built once a day as new-this-week:v1:<date>; a warm read asks no upstream', async () => {
    await fetchNewThisWeek();
    expect(storedRows().map((row) => row.pk)).toContain(
      `CACHE#new-this-week:v1:${TODAY}`,
    );
    expect(Math.round(freshHoursLeft('new-this-week:v1'))).toBe(24);

    resetRequests();
    const { body } = await fetchNewThisWeek();

    expect(ids(body)).toEqual([1, 11, 2, 6]);
    expect(requestedUrls()).toHaveLength(0);
  });

  it('serves yesterday’s list, kept 30 seconds, while TMDB is down', async () => {
    vi.setSystemTime(new Date('2026-11-13T10:00:00Z'));
    onTmdb(
      '/discover/tv',
      { results: [show(1, { first_air_date: '2026-11-10' })] },
      { query: { 'first_air_date.gte': '2026-11-06' } },
    );
    await fetchNewThisWeek('2026-11-13');

    vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`));
    setUpstreamConditions({ outage: { status: 503 } });
    const { body, cacheControl, status } = await fetchNewThisWeek();

    expect(status).toBe(200);
    expect(body.date).toBe('2026-11-13');
    expect(body.items.length).toBeGreaterThan(0);
    // another day's list standing in: gone from the CDN within 30 seconds
    expect(cacheControl).toBe('public, max-age=0, s-maxage=30');
  });

  it('keeps a list built while a lookup failed for an hour only', async () => {
    onTmdb('/tv/2', { status_message: 'boom' }, { status: 500 });

    const { body, cacheControl } = await fetchNewThisWeek();

    expect(ids(body)).not.toContain(2);
    expect(cacheControl).toBe('public, max-age=300, s-maxage=3600');
    expect(Math.round(freshHoursLeft('new-this-week:v1'))).toBe(1);
  });

  it('keeps a list built while the genre list failed for an hour only, unnamed', async () => {
    onTmdb('/genre/tv/list', { status_message: 'boom' }, { status: 500 });

    const { body, cacheControl } = await fetchNewThisWeek();

    expect(ids(body)).toContain(2);
    expect(body.items.every((item) => !item.series.genres?.length)).toBe(true);
    expect(cacheControl).toBe('public, max-age=300, s-maxage=3600');
  });

  it('takes yesterday to tomorrow only', async () => {
    expect((await fetchNewThisWeek('2026-11-01')).status).toBe(400);
  });
});
