import { BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import type {
  DurationPage,
  DurationTiles,
  FinishThisWeekend,
  WhereToStart,
} from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { preferredImagesPk } from '@/lib/db/preferredImages/keys';

import { freshHoursLeft, storedRows } from './cacheRows';
import { db } from './db';
import { onTmdb, requestedUrls } from './fakeHttp';
import { request } from './request';

type Seasons = ReadonlyArray<number>;

/** Registers /tv/:id for the facts: episodes per season, minutes per episode */
const show = (
  id: number,
  {
    minutes = 50,
    seasons = [8],
    status = 'Ended',
    type = 'Scripted',
    votes = 1000,
  }: Readonly<{
    minutes?: number;
    seasons?: Seasons;
    status?: string;
    type?: string;
    votes?: number;
  }> = {},
) => {
  onTmdb(`/tv/${id}`, {
    backdrop_path: `/b${id}.jpg`,
    episode_run_time: [minutes],
    first_air_date: '2020-03-01',
    genres: [{ id: 80, name: 'Crime' }],
    id,
    name: `Show ${id}`,
    networks: [{ id: 49, name: 'HBO' }],
    poster_path: `/p${id}.jpg`,
    seasons: seasons.map((count, i) => ({
      air_date: '2020-03-01',
      episode_count: count,
      id: id * 100 + i,
      season_number: i + 1,
    })),
    status,
    type,
    vote_average: 7 + id / 100,
    vote_count: votes,
  });
};

const ids = (...list: number[]) => ({
  results: list.map((id) => ({
    id,
    name: `Show ${id}`,
    poster_path: '/p.jpg',
  })),
  total_pages: 3,
  total_results: 50,
});

const get = async <T>(path: string) => {
  const response = await request(path);
  return {
    body: (await response.json()) as T,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

describe('consumers: GET /duration', () => {
  it('lists the five tiles with exact and estimated counts', async () => {
    // Sample: 4 shows; 1 is a 4-hour miniseries, 1 a 5-season show
    onTmdb(
      '/discover/tv',
      { ...ids(1, 2, 3, 4), total_results: 20000 },
      { query: { 'vote_count.gte': '200' } },
    );
    onTmdb(
      '/discover/tv',
      { ...ids(1), total_results: 1104 },
      { query: { with_type: '2' } },
    );
    onTmdb(
      '/discover/tv',
      { ...ids(1), total_results: 9870 },
      { query: { with_status: '3' } },
    );
    show(1, { minutes: 50, seasons: [5] }); // 250 min, ended
    show(2, { seasons: [10, 10, 10, 10, 10] }); // long haul
    show(3, { seasons: [10], status: 'Returning Series' }); // one season
    show(4, { seasons: [10, 10] });

    const { body, cacheControl } = await get<DurationTiles>('/duration');

    expect(body.tiles.map((t) => [t.bucket, t.count, t.exact])).toEqual([
      ['under-6-hours', 1104, true],
      ['one-weekend', 0, false], // none of the 4: the 250 min one is Under 6 hours' alone
      ['one-season', 5000, false], // only show 3: one season of 10 episodes
      ['long-haul', 5000, false],
      ['complete-stories', 9870, true],
    ]);
    expect(cacheControl).toContain('s-maxage=604800');
    expect(body.tiles[0]?.preview.map((s) => s.id)).toEqual([1]);
    expect(db.dump('Cache').map((item) => String(item.pk))).toContainEqual(
      expect.stringMatching(/^CACHE#duration:v4:tiles:v6:\d{4}-\d{2}-\d{2}$/),
    );
    // The sample's first page gives the number of such shows: asked once
    const samplePageOne = requestedUrls().filter(
      (url) =>
        url.pathname === '/3/discover/tv' &&
        url.searchParams.get('vote_count.gte') === '200' &&
        url.searchParams.get('page') === '1',
    );
    expect(samplePageOne).toHaveLength(1);
  });

  it('lists a tile from as many discover pages as it takes, up to 20 shows', async () => {
    // One weekend: 20 candidates a page, 8 of them 6 to 10 hours and ended
    for (const page of [1, 2, 3, 4]) {
      const first = page * 100;
      const list = Array.from({ length: 20 }, (_, i) => first + i);
      onTmdb(
        '/discover/tv',
        { ...ids(...list), total_pages: 50 },
        { query: { page: String(page), with_type: '2' } },
      );
      for (const id of list) {
        // 8 short ones (8 × 50 min), the rest five long seasons
        show(
          id,
          id % 20 < 8 ? { seasons: [8] } : { seasons: [10, 10, 10, 10, 10] },
        );
      }
    }

    const { body } = await get<DurationPage>('/duration/one-weekend');

    // pages 1 to 3 hold 24 that fit: the first 20, page 4 is never read
    expect(body.items).toHaveLength(20);
    expect(body.items.map((s) => s.id).slice(0, 9)).toEqual([
      100, 101, 102, 103, 104, 105, 106, 107, 200,
    ]);
    expect(body.items.every((s) => (s.totalMinutes ?? 0) <= 600)).toBe(true);
    expect([body.page, body.nextPage]).toEqual([1, null]);
    expect(
      (await get<DurationPage>('/duration/one-weekend?page=2')).body.items,
    ).toEqual([]);
  });

  it('stops reading after 8 pages, and a tile with under three shows is flagged for the hub', async () => {
    // One season: 8 pages of long shows hold a single one-season show
    for (let page = 1; page <= 9; page++) {
      const list = Array.from({ length: 20 }, (_, i) => page * 100 + i);
      onTmdb(
        '/discover/tv',
        { ...ids(...list), total_pages: 50 },
        { query: { page: String(page), with_type: '2|4' } },
      );
      for (const id of list) {
        show(id, id === 305 ? { seasons: [10] } : { seasons: [10, 10] });
      }
    }
    onTmdb(
      '/discover/tv',
      { ...ids(1), total_results: 20000 },
      {
        query: { 'vote_count.gte': '200' },
      },
    );
    show(1, { seasons: [10, 10] });

    const { body } = await get<DurationPage>('/duration/one-season');
    expect(body.items.map((s) => s.id)).toEqual([305]);

    const tiles = await get<DurationTiles>('/duration');
    const listed = Object.fromEntries(
      tiles.body.tiles.map((tile) => [tile.bucket, tile.listed]),
    );
    expect(listed['one-season']).toBe(1);
  });

  it('rejects an unknown tile and a bad page', async () => {
    expect((await get('/duration/forever')).status).toBe(400);
    expect((await get('/duration/long-haul?page=0')).status).toBe(400);
    expect((await get('/duration/long-haul?page=501')).status).toBe(400);
  });

  it('Finish it this weekend: ended miniseries under 6 hours, best liked first', async () => {
    onTmdb('/discover/tv', ids(1, 2, 3), { query: { with_type: '2' } });
    show(1, { minutes: 50, seasons: [6] }); // 300, ended
    show(2, { minutes: 60, seasons: [4] }); // 240, ended, higher vote_average
    show(3, { minutes: 90, seasons: [8] }); // too long

    const { body } = await get<FinishThisWeekend>('/duration/weekend');

    expect(body.items.map((s) => s.id)).toEqual([2, 1]);
  });
});

describe('duration answers with a show TMDB failed on', () => {
  const PARTIAL = 'public, max-age=300, s-maxage=3600';
  const hoursLeft = freshHoursLeft;

  it('keeps a partial tiles answer out of the CDN and caches it for an hour', async () => {
    onTmdb('/discover/tv', ids(1, 2), { query: { 'vote_count.gte': '200' } });
    onTmdb('/discover/tv', ids(1), { query: { with_type: '2' } });
    onTmdb('/discover/tv', ids(1), { query: { with_status: '3' } });
    show(1, { minutes: 50, seasons: [5] });
    onTmdb('/tv/2', { status_message: 'boom' }, { status: 500 });

    const { cacheControl, status } = await get<DurationTiles>('/duration');

    expect(status).toBe(200);
    expect(cacheControl).toBe(PARTIAL);
    expect(hoursLeft(':tiles:')).toBeLessThanOrEqual(1);
  });

  it('keeps a partial weekend and tile page out of the CDN', async () => {
    onTmdb('/discover/tv', ids(1, 2), { query: { with_type: '2' } });
    show(1, { minutes: 50, seasons: [5] });
    onTmdb('/tv/2', { status_message: 'boom' }, { status: 500 });

    const weekend = await get<FinishThisWeekend>('/duration/weekend');
    const page = await get<DurationPage>('/duration/under-6-hours');

    expect([weekend.status, page.status]).toEqual([200, 200]);
    expect(weekend.body.items.map((s) => s.id)).toEqual([1]);
    expect([weekend.cacheControl, page.cacheControl]).toEqual([
      PARTIAL,
      PARTIAL,
    ]);
    expect(hoursLeft(':weekend:')).toBeLessThanOrEqual(1);
  });

  it('answers the complete ones with the long profile, cached for the day', async () => {
    onTmdb('/discover/tv', ids(1), { query: { with_type: '2' } });
    show(1, { minutes: 50, seasons: [5] });

    const weekend = await get<FinishThisWeekend>('/duration/weekend');

    expect(weekend.cacheControl).toContain('s-maxage=604800');
    expect(hoursLeft(':weekend:')).toBeGreaterThan(23);
  });
});

describe('consumers: GET /duration/where-to-start', () => {
  it('picks a night, a weekend and the long haul in a genre, each with a line', async () => {
    onTmdb('/genre/tv/list', { genres: [{ id: 80, name: 'Crime' }] });
    onTmdb('/discover/tv', ids(1, 2, 3, 4), { query: { with_genres: '80' } });
    show(1, { minutes: 62, seasons: [4] }); // 248 min: a night
    show(2, { minutes: 50, seasons: [10] }); // 500 min: a weekend
    show(3, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 5000 });
    show(4, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 9000 });

    const { body } = await get<WhereToStart>(
      '/duration/where-to-start?genre=crime',
    );

    expect(body.genre).toBe('crime');
    expect(body.picks[0]?.show.network).toEqual({ id: 49, name: 'HBO' });
    expect(body.picks.map((p) => [p.kind, p.show.id, p.why])).toEqual([
      ['night', 1, '4 episodes, 4h 8m in all'],
      ['weekend', 2, '10 episodes, 8h 20m in all'],
      [
        'long-haul',
        4,
        '5 seasons, and the most-voted long-running Crime series on TMDB',
      ],
    ]);
    // the next best for the long haul, for a page that shows show 4 above
    expect(body.backups?.map((p) => [p.kind, p.show.id, p.why])).toEqual([
      [
        'long-haul',
        3,
        '5 seasons, among the most-voted long-running Crime series on TMDB',
      ],
    ]);
  });

  it('skips a pick it cannot make and validates the genre', async () => {
    onTmdb('/discover/tv', ids(), { query: { with_genres: '99' } });

    expect(
      (await get<WhereToStart>('/duration/where-to-start?genre=documentary'))
        .body.picks,
    ).toEqual([]);
    expect((await get('/duration/where-to-start?genre=x')).status).toBe(400);
    expect((await get('/duration/where-to-start')).status).toBe(400);
  });

  it('picks by theme (any keyword of its set) like by genre', async () => {
    onTmdb('/discover/tv', ids(1, 2, 3), {
      query: { 'vote_count.gte': '500', with_keywords: '4565|12190|178712' },
    });
    show(1, { minutes: 62, seasons: [4] });
    show(2, { minutes: 50, seasons: [10] });
    show(3, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 5000 });

    const { body } = await get<WhereToStart>(
      '/duration/where-to-start?theme=dystopia',
    );

    expect(body.theme).toBe('dystopia');
    expect(body.genre).toBeUndefined();
    expect(body.picks.map((p) => [p.kind, p.show.id, p.why])).toEqual([
      ['night', 1, '4 episodes, 4h 8m in all'],
      ['weekend', 2, '10 episodes, 8h 20m in all'],
      [
        'long-haul',
        3,
        '5 seasons, and the most-voted long-running series with this theme on TMDB',
      ],
    ]);
  });

  it('keeps a genre-bound theme to its genre', async () => {
    onTmdb('/discover/tv', ids(3), {
      query: { with_genres: '18', with_keywords: '208788|11612' },
    });
    show(3, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 5000 });

    const { body } = await get<WhereToStart>(
      '/duration/where-to-start?theme=medical-dramas',
    );

    expect(body.picks.map((p) => p.show.id)).toEqual([3]);
  });

  it('picks in a genre TMDB keeps as a keyword, named as a genre', async () => {
    onTmdb('/discover/tv', ids(4), { query: { with_keywords: '315058' } });
    show(4, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 9000 });

    const { body } = await get<WhereToStart>(
      '/duration/where-to-start?genre=horror',
    );

    expect(body.genre).toBe('horror');
    expect(body.picks.map((p) => [p.kind, p.show.id, p.why])).toEqual([
      [
        'long-haul',
        4,
        '5 seasons, and the most-voted long-running Horror series on TMDB',
      ],
    ]);
  });

  it('picks by country: the most-voted show, a weekend and the long haul', async () => {
    onTmdb('/discover/tv', ids(1, 2, 3, 4), {
      query: { sort_by: 'vote_count.desc', with_origin_country: 'KR' },
    });
    show(1, { minutes: 60, seasons: [9], votes: 9000 }); // 540 min, most voted
    show(2, { minutes: 50, seasons: [4], votes: 100 }); // 200 min
    show(3, { minutes: 50, seasons: [10], votes: 300 }); // 500 min: a weekend
    show(4, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 5000 });

    const { body, cacheControl } = await get<WhereToStart>(
      '/duration/where-to-start?country=kr',
    );

    expect(cacheControl).toContain('s-maxage=604800');
    expect(body.country).toBe('KR');
    expect(body.genre).toBeUndefined();
    expect(body.picks.map((p) => [p.kind, p.show.id, p.why])).toEqual([
      [
        'favourite',
        1,
        '1 season, and the most-voted series from South Korea on TMDB',
      ],
      ['weekend', 3, '10 episodes, 8h 20m in all'],
      [
        'long-haul',
        4,
        '5 seasons, and the most-voted long-running series from South Korea on TMDB',
      ],
    ]);
    expect(body.picks[0]?.show.network).toEqual({ id: 49, name: 'HBO' });
  });

  it('says "among" for a long haul when a show above it took the top spot', async () => {
    onTmdb('/discover/tv', ids(1, 2), {
      query: { sort_by: 'vote_count.desc', with_origin_country: 'GB' },
    });
    // the favourite is also the most-voted long-running series
    show(1, { minutes: 50, seasons: [10, 10, 10, 10, 10], votes: 9000 });
    show(2, { minutes: 50, seasons: [10, 10, 10, 10, 10], votes: 5000 });

    const { body } = await get<WhereToStart>(
      '/duration/where-to-start?country=gb',
    );

    expect(body.picks.map((p) => [p.kind, p.show.id, p.why])).toEqual([
      [
        'favourite',
        1,
        '5 seasons, and the most-voted series from the United Kingdom on TMDB',
      ],
      [
        'long-haul',
        2,
        '5 seasons, among the most-voted long-running series from the United Kingdom on TMDB',
      ],
    ]);
  });

  it('answers a retryable 503 and caches nothing when a show in the pool fails', async () => {
    onTmdb('/discover/tv', ids(1, 2, 3), {
      query: { 'vote_count.gte': '500', with_keywords: '4565|12190|178712' },
    });
    show(1, { minutes: 62, seasons: [4] });
    onTmdb('/tv/2', { status_message: 'boom' }, { status: 500 });
    show(3, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 5000 });

    const failed = await get('/duration/where-to-start?theme=dystopia');

    expect(failed.status).toBe(503);
    expect(failed.cacheControl).toBe('no-store');
    expect(
      storedRows().filter((item) => String(item.pk).includes(':start:')),
    ).toEqual([]);

    show(2, { minutes: 50, seasons: [10] });
    const { body, status } = await get<WhereToStart>(
      '/duration/where-to-start?theme=dystopia',
    );
    expect(status).toBe(200);
    expect(body.picks.map((p) => p.show.id)).toEqual([1, 2, 3]);
  });

  it('keeps one cache entry per filter', async () => {
    onTmdb('/discover/tv', ids());
    await get('/duration/where-to-start?genre=crime');
    await get('/duration/where-to-start?theme=dystopia');
    await get('/duration/where-to-start?country=GB');

    const keys = storedRows().map((item) => String(item.pk));
    expect(keys.filter((key) => key.includes(':start:'))).toHaveLength(3);
  });

  it('wants exactly one of genre, theme and country, each well formed', async () => {
    const path = (query: string) => `/duration/where-to-start?${query}`;
    expect((await get(path('genre=crime&theme=dystopia'))).status).toBe(400);
    expect((await get(path('genre=crime&country=GB'))).status).toBe(400);
    expect((await get(path('theme=x'))).status).toBe(400);
    // only landings' genres and themes: anything else would build and cache
    // a pool of its own
    expect((await get(path('genre=dystopia'))).status).toBe(400);
    expect((await get(path('genre=80'))).status).toBe(400);
    expect((await get(path('theme=crime'))).status).toBe(400);
    expect((await get(path('theme=heist'))).status).toBe(400);
    expect((await get(path('theme=constructor'))).status).toBe(400);
    // an id parameter is refused
    expect((await get(path('keyword=4565'))).status).toBe(400);
    expect((await get(path('country=GBR'))).status).toBe(400);
    expect((await get(path('country=ZZ'))).status).toBe(400);
    expect((await get(path('country=1'))).status).toBe(400);
  });
});

describe("duration shows: the admin's backdrop, else TMDB's", () => {
  const pick = (seriesId: number) =>
    db.seed('PreferredImages', [
      {
        backdropColor: '#112233',
        backdropImagePath: `/picked${seriesId}.jpg`,
        pk: preferredImagesPk(seriesId),
      },
    ]);
  const pickReads = () =>
    db.calls.filter(
      (command) =>
        command instanceof BatchGetItemCommand &&
        'PreferredImages' in (command.input.RequestItems ?? {}),
    );

  it('reads the pick after the day’s cached build, so a new pick shows at once', async () => {
    onTmdb('/discover/tv', ids(1, 2), { query: { with_type: '2' } });
    show(1, { minutes: 50, seasons: [6] });
    show(2, { minutes: 60, seasons: [4] });
    await get<FinishThisWeekend>('/duration/weekend');
    await get<DurationPage>('/duration/under-6-hours');
    pick(1);

    const weekend = await get<FinishThisWeekend>('/duration/weekend');
    const page = await get<DurationPage>('/duration/under-6-hours');

    for (const items of [weekend.body.items, page.body.items]) {
      const byId = Object.fromEntries(
        items.map((s) => [s.id, s.backdropImage]),
      );
      expect(byId).toEqual({
        1: expect.stringContaining('/picked1.jpg'),
        2: expect.stringContaining('/b2.jpg'),
      });
    }
  });

  it('draws Where to start’s picks and backups with it', async () => {
    onTmdb('/genre/tv/list', { genres: [{ id: 80, name: 'Crime' }] });
    onTmdb('/discover/tv', ids(1, 2, 3, 4), { query: { with_genres: '80' } });
    show(1, { minutes: 62, seasons: [4] });
    show(2, { minutes: 50, seasons: [10] });
    show(3, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 5000 });
    show(4, { minutes: 50, seasons: [13, 13, 13, 13, 13], votes: 9000 });
    pick(1);
    pick(3);

    const { body } = await get<WhereToStart>(
      '/duration/where-to-start?genre=crime',
    );

    expect(body.picks.map((p) => [p.show.id, p.show.backdropImage])).toEqual([
      [1, expect.stringContaining('/picked1.jpg')],
      [2, expect.stringContaining('/b2.jpg')],
      [4, expect.stringContaining('/b4.jpg')],
    ]);
    expect(body.backups?.map((p) => p.show.backdropImage)).toEqual([
      expect.stringContaining('/picked3.jpg'),
    ]);
  });

  it('reads the five tiles’ picks in one batch read', async () => {
    onTmdb(
      '/discover/tv',
      { ...ids(1, 2, 3, 4), total_results: 20000 },
      { query: { 'vote_count.gte': '200' } },
    );
    onTmdb('/discover/tv', ids(1), { query: { with_type: '2' } });
    onTmdb('/discover/tv', ids(1), { query: { with_status: '3' } });
    show(1, { minutes: 50, seasons: [5] });
    show(2, { seasons: [10, 10, 10, 10, 10] });
    show(3, { seasons: [10], status: 'Returning Series' });
    show(4, { seasons: [10, 10] });
    await get<DurationTiles>('/duration');
    pick(1);
    db.calls.length = 0;

    const { body } = await get<DurationTiles>('/duration');

    expect(body.tiles[0]?.preview[0]?.backdropImage).toContain('/picked1.jpg');
    expect(pickReads()).toHaveLength(1);
  });
});
