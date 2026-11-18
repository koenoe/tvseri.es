import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkUser, fetchMe } from './me';

const USER = {
  createdAt: '2024-01-01T00:00:00.000Z',
  id: 'user-1',
  role: 'user',
  username: 'margaux',
  version: 1,
};

function meResponds(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
    ),
  );
}

describe('fetchMe', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
  });

  it('returns the signed-in user', async () => {
    meResponds(USER);
    await expect(fetchMe('access-1')).resolves.toMatchObject({ id: 'user-1' });
  });

  // The slug rule on usernames is for writes: a stored username from
  // before it must not sign its owner out.
  it('accepts a stored username that predates the slug rule', async () => {
    meResponds({ ...USER, username: 'Margaux_R' });
    await expect(fetchMe('access-1')).resolves.toMatchObject({
      username: 'Margaux_R',
    });
  });
});

describe('checkUser', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
  });

  const responds = (status: number, body: unknown) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(body), {
            headers: { 'content-type': 'application/json' },
            status,
          }),
      ),
    );

  it('returns the user', async () => {
    responds(200, USER);
    await expect(checkUser('access-1')).resolves.toMatchObject({
      kind: 'user',
      user: { id: 'user-1' },
    });
  });

  it('is gone only on the API’s AccountGone 401', async () => {
    responds(401, { message: 'AccountGone', status: 401 });
    await expect(checkUser('access-1')).resolves.toEqual({ kind: 'gone' });
  });

  it.each([
    [401, { message: 'Unauthorized', status: 401 }],
    [404, { message: 'Not Found', status: 404 }],
    [500, { message: 'Internal Server Error' }],
    [503, {}],
  ])('is unknown on a %i', async (status, body) => {
    responds(status, body);
    await expect(checkUser('access-1')).resolves.toEqual({ kind: 'unknown' });
  });

  it('is unknown when the API cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    await expect(checkUser('access-1')).resolves.toEqual({ kind: 'unknown' });
  });
});
