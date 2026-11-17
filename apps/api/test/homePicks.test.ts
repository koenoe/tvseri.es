import type { BecauseYouWatched, MoreGenre } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const listItem = (list: string, id: number) => ({
  createdAt: 1,
  gsi2pk: `LIST#${USER_ID}#${list}`,
  gsi2sk: 1,
  id,
  pk: `USER#${USER_ID}`,
  sk: `LIST#${list}#ITEM#${id}`,
  title: `Show ${id}`,
});

const tv = (id: number, extra: Record<string, unknown> = {}) => ({
  genre_ids: [878],
  id,
  name: `Show ${id}`,
  poster_path: `/p${id}.jpg`,
  ...extra,
});

const get = async <T>(path: string) => {
  const response = await request(path, { as: USER_ID });
  return {
    body: (await response.json()) as T,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

describe('GET /me/home/because-you-watched', () => {
  const setup = () => {
    seedUser();
    db.seed('Lists', [
      listItem('FAVORITES', 100),
      listItem('WATCHED', 100),
      listItem('WATCHED', 5),
      listItem('WATCHLIST', 7),
    ]);
    onTmdb('/tv/100', {
      id: 100,
      keywords: { results: [{ id: 9, name: 'dystopia' }] },
      name: 'Severance',
      networks: [{ id: 2552, logo_path: '/l.png', name: 'Apple TV+' }],
      poster_path: '/s.jpg',
      recommendations: { results: [tv(1), tv(5), tv(7), tv(100)] },
    });
    onTmdb(
      '/discover/tv',
      { results: [tv(2), tv(1)] },
      { query: { with_keywords: '9' } },
    );
    onTmdb(
      '/discover/tv',
      { results: [tv(3)] },
      { query: { with_networks: '2552' } },
    );
  };

  it('needs a signed-in user', async () => {
    expect((await request('/me/home/because-you-watched')).status).toBe(401);
  });

  it('is about a favourite, minus the library and the show itself, with reasons', async () => {
    setup();

    const { body, cacheControl } = await get<BecauseYouWatched>(
      '/me/home/because-you-watched?date=2026-11-12',
    );

    expect(body.source).toMatchObject({
      from: 'favorite',
      id: 100,
      // the show itself, for the If you liked card's poster
      series: { id: 100, title: 'Severance' },
      title: 'Severance',
    });
    expect(
      body.items.map((i) => [i.series.id, i.reason.kind, i.reason.label]),
    ).toEqual([
      [2, 'keyword', 'dystopia'],
      [3, 'network', 'Apple TV+'],
      [1, 'recommendation', ''],
    ]);
    expect(cacheControl).toBe('private, max-age=86400');
  });

  it('shares the TMDB part across viewers through the Cache table', async () => {
    setup();
    await get('/me/home/because-you-watched?date=2026-11-12');

    expect(db.dump('Cache').map((item) => item.pk)).toContain(
      'CACHE#home:because:v4:100',
    );
  });

  it('has no source for an empty library', async () => {
    seedUser();

    expect(
      (await get<BecauseYouWatched>('/me/home/because-you-watched')).body,
    ).toEqual({
      items: [],
      source: null,
    });
  });

  it('rejects a malformed date', async () => {
    seedUser();

    expect(
      (await get('/me/home/because-you-watched?date=tomorrow')).status,
    ).toBe(400);
  });
});

describe('GET /me/home/if-you-liked', () => {
  it('starts from a finished show', async () => {
    seedUser();
    db.seed('Lists', [listItem('WATCHED', 5)]);
    onTmdb('/tv/5', {
      id: 5,
      name: 'The Bear',
      recommendations: { results: [tv(8)] },
    });

    const { body } = await get<BecauseYouWatched>(
      '/me/home/if-you-liked?date=2026-11-12',
    );

    expect(body.source).toMatchObject({
      from: 'watched',
      id: 5,
      series: { id: 5 },
      title: 'The Bear',
    });
    expect(body.items.map((i) => i.series.id)).toEqual([8]);
  });
});

describe('GET /me/home/more-genre', () => {
  it('finds the most common genre of the watchlist and lists it minus the library', async () => {
    seedUser();
    db.seed('Lists', [
      listItem('WATCHLIST', 1),
      listItem('WATCHLIST', 2),
      listItem('WATCHLIST', 3),
      listItem('WATCHED', 40),
    ]);
    onTmdb('/tv/1', {
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
      id: 1,
      name: 'A',
    });
    onTmdb('/tv/2', {
      genres: [
        { id: 10765, name: 'Sci-Fi & Fantasy' },
        { id: 18, name: 'Drama' },
      ],
      id: 2,
      name: 'B',
    });
    onTmdb('/tv/3', { genres: [{ id: 35, name: 'Comedy' }], id: 3, name: 'C' });
    onTmdb('/genre/tv/list', {
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
    });
    onTmdb(
      '/discover/tv',
      { results: [tv(1), tv(40), tv(50), tv(51)] },
      { query: { with_genres: '10765' } },
    );

    const { body } = await get<MoreGenre>('/me/home/more-genre');

    expect(body.genre).toEqual({ id: 10765, name: 'Sci-Fi & Fantasy' });
    expect(body.share).toEqual({ matching: 2, sampled: 3 });
    expect(body.items.map((s) => s.id)).toEqual([50, 51]);

    // The genre list and the genre's discover page are the same for
    // everyone: the next view asks TMDB nothing
    resetRequests();
    const again = await get<MoreGenre>('/me/home/more-genre');
    expect(again.body).toEqual(body);
    expect(requestedUrls()).toHaveLength(0);
  });

  it('is empty for an empty watchlist', async () => {
    seedUser();

    expect((await get<MoreGenre>('/me/home/more-genre')).body).toEqual({
      genre: null,
      items: [],
      share: { matching: 0, sampled: 0 },
    });
  });
});
