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

  it('rejects writes to another user (requireIsMe)', async () => {
    seedUser();
    seedUser({ id: OTHER_USER_ID, username: 'other' });
    const response = await request(`/user/${OTHER_USER_ID}/list/watchlist`, {
      as: USER_ID,
      body: {
        id: 1,
        posterPath: '/p.jpg',
        slug: 'x',
        status: 'Ended',
        title: 'X',
      },
      method: 'POST',
    });
    expect(response.status).toBe(401);
  });
});

describe('public catalogue caching', () => {
  it('serves TMDB data with the long public profile', async () => {
    onTmdb('/genre/tv/list', { genres: [{ id: 18, name: 'Drama' }] });
    const response = await request('/genres');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toMatch(/^public, /);
    expect(await response.json()).toEqual([{ id: 18, name: 'Drama' }]);
  });
});

describe('B20a country on the user', () => {
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
