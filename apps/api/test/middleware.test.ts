import { describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb } from './fakeHttp';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

describe('auth middleware', () => {
  it('rejects /me without a token', async () => {
    const response = await request('/me');
    expect(response.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const response = await request('/me', {
      headers: { authorization: 'Bearer forged' },
    });
    expect(response.status).toBe(401);
  });

  it('returns the signed-in user, never cached by a shared cache', async () => {
    seedUser({ username: 'wren' });
    const response = await request('/me', { as: USER_ID });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({
      id: USER_ID,
      username: 'wren',
    });
  });

  describe("another user's library", () => {
    const listItem = {
      id: 1,
      posterPath: '/p.jpg',
      slug: 'x',
      status: 'Ended',
      title: 'X',
    };
    const batchItem = (userId: string) => ({
      episode: {
        airDate: '2020-01-01T00:00:00.000Z',
        episodeNumber: 1,
        runtime: 30,
        seasonNumber: 1,
        stillPath: null,
        title: 'Pilot',
      },
      tvSeries: { id: 1, posterPath: '/p.jpg', slug: 'x', title: 'X' },
      userId,
      watchedAt: Date.UTC(2024, 0, 1),
    });
    const unmarkItem = (userId: string) => ({
      episodeNumber: 1,
      seasonNumber: 1,
      tvSeries: { id: 1, posterPath: '/p.jpg', slug: 'x', title: 'X' },
      userId,
    });

    // Something to lose: a mark and list rows of the other user
    const seedOther = () => {
      seedUser();
      seedUser({ id: OTHER_USER_ID, username: 'other' });
      db.seed('Watched', [
        {
          pk: `USER#${OTHER_USER_ID}`,
          seasonNumber: 1,
          seriesId: 1,
          sk: 'SERIES#1#S001#E001',
          userId: OTHER_USER_ID,
          watchedAt: Date.UTC(2024, 0, 1),
        },
      ]);
      for (const list of ['WATCHLIST', 'FAVORITES', 'IN_PROGRESS']) {
        db.seed('Lists', [
          {
            createdAt: 1,
            id: 1,
            pk: `USER#${OTHER_USER_ID}`,
            sk: `LIST#${list}#ITEM#1`,
          },
        ]);
      }
      return { lists: db.dump('Lists'), watched: db.dump('Watched') };
    };

    it.each([
      ['POST', 'watched/series/1', { watchProvider: null }],
      ['POST', 'watched/series/1/season/1', { watchProvider: null }],
      ['POST', 'watched/series/1/season/1/episode/1', { watchProvider: null }],
      ['DELETE', 'watched/series/1', undefined],
      ['DELETE', 'watched/series/1/season/1', undefined],
      ['DELETE', 'watched/series/1/season/1/episode/1', undefined],
      ['POST', 'watched/batch', [batchItem(OTHER_USER_ID)]],
      ['POST', 'watched/batch/delete', [unmarkItem(OTHER_USER_ID)]],
      ['POST', 'list/watchlist', listItem],
      ['DELETE', 'list/in_progress/1', undefined],
    ])(
      'refuses %s /user/:other/%s and leaves their data alone',
      async (method, path, body) => {
        const before = seedOther();

        const response = await request(`/user/${OTHER_USER_ID}/${path}`, {
          as: USER_ID,
          body,
          method,
        });

        expect(response.status).toBe(403);
        expect(db.dump('Watched')).toEqual(before.watched);
        expect(db.dump('Lists')).toEqual(before.lists);
      },
    );

    // Your own route, but a batch item that names someone else
    it.each([
      ['watched/batch', batchItem],
      ['watched/batch/delete', unmarkItem],
    ])(
      'refuses a %s item of another user on your own route',
      async (path, item) => {
        const before = seedOther();

        const response = await request(`/user/${USER_ID}/${path}`, {
          as: USER_ID,
          body: [item(USER_ID), item(OTHER_USER_ID)],
          method: 'POST',
        });

        expect(response.status).toBe(403);
        expect(db.dump('Watched')).toEqual(before.watched);
        expect(db.dump('Lists')).toEqual(before.lists);
      },
    );
  });
});

describe('public catalogue caching', () => {
  it('serves TMDB data with the long public profile', async () => {
    onTmdb('/person/1/external_ids', { id: 1, imdb_id: 'nm0000001' });
    const response = await request('/person/1/external-ids');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toMatch(/^public, /);
    expect(await response.json()).toMatchObject({
      links: [expect.objectContaining({ id: 'nm0000001', type: 'imdb' })],
    });
  });
});

describe('country on the user', () => {
  it('saves the region and returns it from /me', async () => {
    seedUser({ username: 'wren' });
    const saved = await request('/me', {
      as: USER_ID,
      body: { country: 'NL' },
      method: 'PUT',
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      country: 'NL',
      username: 'wren',
    });
    const me = await request('/me', { as: USER_ID });
    expect(await me.json()).toMatchObject({ country: 'NL' });
  });

  it('returns the country the auth service stored at sign-up', async () => {
    seedUser({ country: 'GB' });
    const me = await request('/me', { as: USER_ID });
    expect(await me.json()).toMatchObject({ country: 'GB' });
  });

  it('rejects anything but an ISO 3166-1 alpha-2 code, and an empty body', async () => {
    seedUser();
    for (const body of [{ country: 'Netherlands' }, { country: 'nl' }, {}]) {
      const response = await request('/me', {
        as: USER_ID,
        body,
        method: 'PUT',
      });
      expect(response.status).toBe(400);
    }
  });

  it('keeps the country out of public user responses', async () => {
    seedUser({ country: 'GB' });
    const response = await request(`/user/${USER_ID}`);
    expect(await response.json()).not.toHaveProperty('country');
  });
});

describe('JSON 404s', () => {
  it('answers unknown paths with JSON', async () => {
    const response = await request('/nope');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: 'Not Found',
      status: 404,
    });
  });

  it('keeps the public cache headers of a cached 404', async () => {
    const response = await request('/series/not-a-number');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toMatch(/^public, /);
    expect(await response.json()).toEqual({
      message: 'Not Found',
      status: 404,
    });
  });

  it('keeps the public cache headers when a route finds nothing', async () => {
    const response = await request('/series/1234567');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toMatch(/^public, /);
    expect(await response.json()).toEqual({
      message: 'Not Found',
      status: 404,
    });
  });
});

describe('error responses are never kept', () => {
  // Routes set their (browser-only) cache header before or after the
  // handler: a failure must not be kept by the browser for a day either
  it.each([
    ['personal Home row', '/me/home/more-genre', false],
    ['dashboard metrics read', '/metrics/web-vitals/summary', true],
  ])('a failed %s is no-store', async (_, path, admin) => {
    seedUser();
    // The user is read first, then every later read fails
    const send = db.send.bind(db);
    let reads = 0;
    vi.spyOn(db, 'send').mockImplementation(async (command) => {
      reads += 1;
      if (reads > 1) {
        throw new Error('DynamoDB is down');
      }
      return send(command);
    });

    const response = await request(path, { admin, as: USER_ID });

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control') ?? '').not.toMatch(/max-age/);
  });
});
