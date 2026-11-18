import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

describe('bounded id params', () => {
  it('serves a person and a network by a normal id', async () => {
    onTmdb('/person/17419', { id: 17419, name: 'Bryan Cranston' });
    onTmdb('/network/49', { id: 49, name: 'HBO' });

    expect((await request('/person/17419')).status).toBe(200);
    expect((await request('/network/49')).status).toBe(200);
  });

  it('answers a cached 404 to an id of more than 10 digits, without asking TMDB', async () => {
    onTmdb('/person/12345678901', { id: 1, name: 'Nobody' });
    onTmdb('/network/12345678901', { id: 1, name: 'Nobody' });

    for (const path of ['/person/12345678901', '/network/12345678901']) {
      resetRequests();
      const response = await request(path);
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toContain('s-maxage');
      expect(requestedUrls()).toEqual([]);
    }
  });
});

describe('/user/:id/watched/count uses the validated query', () => {
  it('counts a date range and rejects nothing it used to accept', async () => {
    seedUser();
    db.seed('Watched', [
      {
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: Date.parse('2025-07-02T20:00:00Z'),
        pk: `USER#${USER_ID}`,
        seasonNumber: 1,
        sk: 'SERIES#1#S001#E001',
        watchedAt: Date.parse('2025-07-02T20:00:00Z'),
      },
    ]);

    const response = await request(
      `/user/${USER_ID}/watched/count?start_date=2025-07-01&end_date=2025-07-31`,
    );

    expect(await response.json()).toEqual({ count: 1 });
    expect(
      (await request(`/user/${USER_ID}/watched/count?start_date=nope`)).status,
    ).toBe(400);
  });
});

describe('mark routes: series and season numbers', () => {
  const marks = [
    ['POST', '/series/0'],
    ['POST', '/series/1/season/1000'],
    ['POST', '/series/1/season/99999999999999999999'],
    ['DELETE', '/series/12345678901'],
    ['DELETE', '/series/1/season/1000'],
  ] as const;

  it('rejects a number out of range before asking TMDB or the database', async () => {
    seedUser();
    for (const [method, path] of marks) {
      resetRequests();
      const response = await request(`/user/${USER_ID}/watched${path}`, {
        as: USER_ID,
        body: method === 'POST' ? { watchProvider: null } : undefined,
        method,
      });
      expect([method, path, response.status]).toEqual([method, path, 400]);
      expect(requestedUrls()).toEqual([]);
    }
  });
});

describe('catalogue path params', () => {
  it('rejects ids and numbers out of range before asking TMDB', async () => {
    const paths = [
      '/series/12345678901',
      '/series/0',
      '/series/1/season/10000',
      '/series/1/season/1000',
      '/series/1/season/1/episode/99999',
      '/series/1/season/123456/ratings',
      '/discover/landing/genre/a-slug-that-is-much-longer-than-forty-chars/facts',
    ];
    for (const path of paths) {
      resetRequests();
      const response = await request(path);
      expect([path, response.status]).toEqual([path, 400]);
      expect(requestedUrls()).toEqual([]);
    }
  });

  it('never routes a season that is not digits to TMDB', async () => {
    for (const path of [
      '/series/1/season/abc/episode/1',
      '/series/1/season/1e3',
      '/series/1/season/-1',
    ]) {
      resetRequests();
      expect([path, (await request(path)).status]).toEqual([path, 404]);
      expect(requestedUrls()).toEqual([]);
    }
  });

  it('serves a normal id', async () => {
    onTmdb('/person/818/external_ids', { id: 818 });
    expect((await request('/person/818/external-ids')).status).toBe(200);
  });
});

describe('/user/:id and /user/by-username', () => {
  it('answers 404 to an id or username no one can have, without a read', async () => {
    seedUser();
    for (const path of [
      `/user/${'A'.repeat(65)}`,
      `/user/@${'a'.repeat(129)}`,
      `/user/${'A'.repeat(2000)}/watched/count`,
      `/user/by-username/${'a'.repeat(129)}`,
    ]) {
      db.calls.length = 0;
      const response = await request(path);
      expect([path.slice(0, 30), response.status, db.calls.length]).toEqual([
        path.slice(0, 30),
        404,
        0,
      ]);
    }
  });

  it('still finds a user by id, any case, and by @username', async () => {
    seedUser();
    const count = async (ref: string) =>
      (await request(`/user/${ref}/followers/count`)).status;
    expect(await count(USER_ID)).toBe(200);
    expect(await count(USER_ID.toLowerCase())).toBe(200);
    expect(await count('@user-aaaa')).toBe(200);
  });

  it('rejects a stats year that is not four digits', async () => {
    seedUser();
    expect(
      (await request(`/user/${USER_ID}/stats/2025abc/summary`)).status,
    ).toBe(400);
  });
});
