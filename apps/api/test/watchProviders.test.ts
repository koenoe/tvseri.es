import { describe, expect, it } from 'vitest';

import { db } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const TMDB_LOGO = 'https://image.tmdb.org/t/p/w92/netflix.jpg';

const provider = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  color: '#e50914',
  id: 8,
  logo: TMDB_LOGO,
  logoPath: '/netflix.jpg',
  name: 'Netflix',
  ...overrides,
});

const put = (watchProviders: ReadonlyArray<unknown>) =>
  request('/me/watch-providers', {
    as: USER_ID,
    body: { watchProviders },
    method: 'PUT',
  });

const publicProviders = async () => {
  const response = await request('/user/by-username/user-aaaa');
  const body = (await response.json()) as { watchProviders?: unknown };
  return body.watchProviders;
};

describe('streaming services (PUT /me/watch-providers)', () => {
  it('builds the logo from the TMDB path and ignores the one sent', async () => {
    seedUser();

    const response = await put([
      provider({ logo: 'https://tracker.example/p.gif' }),
    ]);

    expect(response.status).toBe(200);
    expect(await publicProviders()).toEqual([
      {
        color: '#e50914',
        id: 8,
        logo: TMDB_LOGO,
        logoPath: '/netflix.jpg',
        name: 'Netflix',
      },
    ]);
  });

  it.each([
    [
      'a logo path that is a URL',
      { logoPath: 'https://tracker.example/p.gif' },
    ],
    ['a logo path outside TMDB’s shape', { logoPath: '/../x.gif' }],
    ['a fractional id', { id: 1.5 }],
    ['an empty name', { name: '' }],
    ['a long name', { name: 'x'.repeat(101) }],
    ['a colour that is not a hex', { color: 'url(x)' }],
  ])('refuses %s', async (_, overrides) => {
    seedUser();
    expect((await put([provider(overrides)])).status).toBe(400);
  });

  it('refuses more than 60 services', async () => {
    seedUser();
    const many = Array.from({ length: 61 }, (_, index) =>
      provider({ id: index + 1 }),
    );
    expect((await put(many)).status).toBe(400);
    expect((await put(many.slice(0, 60))).status).toBe(200);
  });

  it('drops stored services that fail validation on read, and never rewrites them', async () => {
    const stored = [
      provider(),
      provider({ id: 9, logo: 'https://tracker.example/p.gif', logoPath: 'x' }),
      provider({ id: 10, logo: 'https://tracker.example/p.gif' }),
    ];
    seedUser({ watchProviders: stored });

    expect(await publicProviders()).toEqual([
      expect.objectContaining({ id: 8, logo: TMDB_LOGO }),
      expect.objectContaining({ id: 10, logo: TMDB_LOGO }),
    ]);
    const me = (await (await request('/me', { as: USER_ID })).json()) as {
      watchProviders: unknown[];
    };
    expect(me.watchProviders).toHaveLength(2);
    expect(db.dump('Users')[0]?.watchProviders).toEqual(stored);
  });
});
