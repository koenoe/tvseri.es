import { describe, expect, it } from 'vitest';

import { onTmdb } from './fakeHttp';
import { request } from './request';

const status = async (path: string) => (await request(path)).status;

describe('query validation on the public routes', () => {
  it('search/series needs a trimmed q of 1 to 100 characters and a 4-digit year', async () => {
    onTmdb(
      '/search/tv',
      { results: [{ id: 1, name: 'Dark', poster_path: '/p.jpg' }] },
      { query: { query: 'dark', year: '2017' } },
    );

    const ok = await request('/search/series?q=%20dark%20&year=2017');
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { id: number }[]).map((s) => s.id)).toEqual([
      1,
    ]);

    expect(await status('/search/series')).toBe(400);
    expect(await status('/search/series?q=')).toBe(400);
    expect(await status('/search/series?q=%20%20')).toBe(400);
    expect(await status(`/search/series?q=${'a'.repeat(101)}`)).toBe(400);
    expect(await status('/search/series?q=dark&year=20x7')).toBe(400);
  });

  it('search/keyword needs a trimmed q of 1 to 100 characters', async () => {
    onTmdb(
      '/search/keyword',
      { results: [{ id: 4565, name: 'dystopia' }] },
      { query: { query: 'dystopia' } },
    );

    const ok = await request('/search/keyword?q=dystopia');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual([{ id: 4565, name: 'dystopia' }]);

    expect(await status('/search/keyword')).toBe(400);
    expect(await status(`/search/keyword?q=${'a'.repeat(101)}`)).toBe(400);
  });

  it('region is a two-letter country code, any case, or absent', async () => {
    onTmdb(
      '/watch/providers/tv',
      { results: [] },
      { query: { watch_region: 'GB' } },
    );

    expect(await status('/discover/watch-providers?region=gb')).toBe(200);
    expect(await status('/discover/watch-providers')).toBe(200);
    expect(await status('/discover/watch-providers?region=')).toBe(200);
    expect(await status('/discover/watch-providers?region=GBR')).toBe(400);
    expect(await status('/discover/watch-providers?region=1')).toBe(400);
    expect(await status('/collection/must-watch-on-apple-tv?region=xx1')).toBe(
      400,
    );
  });

  it('include_colors is true or false', async () => {
    expect(await status('/discover/watch-providers?include_colors=true')).toBe(
      200,
    );
    expect(await status('/discover/watch-providers?include_colors=false')).toBe(
      200,
    );
    expect(await status('/discover/watch-providers?include_colors=maybe')).toBe(
      400,
    );
  });

  it('dominant-color needs a TMDB image url', async () => {
    expect(await status('/dominant-color')).toBe(400);
    expect(await status('/dominant-color?url=https://example.com/a.jpg')).toBe(
      400,
    );
  });

  it('discover page is 1 to 500', async () => {
    expect(await status('/discover?page=0')).toBe(400);
    expect(await status('/discover?page=501')).toBe(400);
    expect(await status('/discover?page=abc')).toBe(400);
  });
});

describe('more bounded inputs', () => {
  it('series region, rating source and include_images take only their shapes', async () => {
    expect(await status('/series/1/content-rating?region=GBR')).toBe(400);
    expect(await status('/series/1/watch-providers?region=1')).toBe(400);
    expect(await status(`/series/1/rating?source=${'a'.repeat(30)}`)).toBe(400);
    expect(await status('/series/1/rating?source=im%20db')).toBe(400);
    expect(await status('/series/1?include_images=yes')).toBe(400);
  });

  it('follow checks take a bounded user id', async () => {
    const { seedUser, USER_ID } = await import('./seed');
    seedUser();
    const check = (path: string) => request(path, { as: USER_ID });
    expect(
      (await check(`/user/${USER_ID}/follower/${'x'.repeat(65)}`)).status,
    ).toBe(400);
    expect(
      (await check(`/user/${USER_ID}/following/${'x'.repeat(65)}`)).status,
    ).toBe(400);
    expect((await check(`/user/${USER_ID}/following/${USER_ID}`)).status).toBe(
      200,
    );
  });

  it('a list item needs a positive integer id, bounded strings and a plausible time', async () => {
    const { seedUser, USER_ID } = await import('./seed');
    seedUser();
    const add = (body: Record<string, unknown>) =>
      request(`/user/${USER_ID}/list/favorites`, {
        as: USER_ID,
        body: {
          id: 1,
          posterPath: '/p.jpg',
          slug: 'show',
          status: 'Ended',
          title: 'Show',
          ...body,
        },
        method: 'POST',
      });

    expect((await add({})).status).toBe(201);
    expect((await add({ id: 1.5 })).status).toBe(400);
    expect((await add({ id: -1 })).status).toBe(400);
    expect((await add({ title: 'x'.repeat(1001) })).status).toBe(400);
    expect((await add({ createdAt: 12 })).status).toBe(400);
  });
});
