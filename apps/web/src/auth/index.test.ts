import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encryptToken } from './crypto';
import auth from './index';

const NOW_S = Math.floor(Date.now() / 1000);

const USER = {
  createdAt: '2024-01-01T00:00:00.000Z',
  id: 'user-1',
  role: 'user',
  username: 'margaux',
  version: 1,
};

const authClient = vi.hoisted(() => ({
  refresh: vi.fn(),
  verify: vi.fn(),
}));
vi.mock('./client', () => ({ getAuthClient: () => authClient }));

const cookieStore = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));

const sessionCookie = (expiresIn: number) =>
  encryptToken({
    accessToken: 'access-1',
    expiresAt: NOW_S + expiresIn,
    refreshToken: 'refresh-1',
  });

function withSessionCookie(value: string | undefined) {
  cookieStore.get.mockImplementation((name: string) =>
    name === '__tvseries_session' && value ? { name, value } : undefined,
  );
}

function meResponds(status: number, body: unknown = USER) {
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
}

describe('auth', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_KEY', 'test-secret');
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    authClient.verify.mockResolvedValue({
      aud: 'web',
      subject: { properties: { id: 'user-1', role: 'user' }, type: 'user' },
    });
    meResponds(200);
  });

  describe('auth() in RSC', () => {
    it('is empty without a session cookie', async () => {
      withSessionCookie(undefined);

      expect(await auth()).toEqual({
        accessToken: null,
        expiresAt: null,
        user: null,
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns the verified user', async () => {
      withSessionCookie(await sessionCookie(3600));

      expect(await auth()).toEqual({
        accessToken: 'access-1',
        expiresAt: NOW_S + 3600,
        user: USER,
      });
      expect(authClient.verify).toHaveBeenCalledWith(
        expect.anything(),
        'access-1',
      );
    });

    it('never refreshes or writes cookies, even close to expiry', async () => {
      withSessionCookie(await sessionCookie(30));

      const session = await auth();

      expect(session.accessToken).toBe('access-1');
      expect(authClient.refresh).not.toHaveBeenCalled();
      expect(cookieStore.set).not.toHaveBeenCalled();
      expect(cookieStore.delete).not.toHaveBeenCalled();
    });

    it('is empty, but keeps the cookie, once the token expired', async () => {
      withSessionCookie(await sessionCookie(-5));

      expect((await auth()).user).toBeNull();
      expect(authClient.refresh).not.toHaveBeenCalled();
      expect(cookieStore.delete).not.toHaveBeenCalled();
    });

    it('is empty when the access token does not verify', async () => {
      withSessionCookie(await sessionCookie(3600));
      authClient.verify.mockResolvedValue({ err: new Error('bad token') });

      expect((await auth()).user).toBeNull();
    });

    it.each([
      ['the API fails', 503, { message: 'Down' }],
      ['/me does not match the user schema', 200, { id: 'user-1' }],
    ])('is empty when %s', async (_, status, body) => {
      withSessionCookie(await sessionCookie(3600));
      meResponds(status, body);

      expect((await auth()).user).toBeNull();
      expect(cookieStore.delete).not.toHaveBeenCalled();
    });
  });

  describe('auth(req) in route handlers', () => {
    const request = async (expiresIn: number) =>
      new NextRequest('https://www.tvseri.es/api/u/margaux/watched', {
        headers: {
          cookie: `__tvseries_session=${await sessionCookie(expiresIn)}`,
        },
      });

    it('reads the cookie the proxy forwarded and never refreshes', async () => {
      const session = await auth(await request(30));

      expect(session.user).toEqual(USER);
      expect(authClient.refresh).not.toHaveBeenCalled();
      expect(cookieStore.set).not.toHaveBeenCalled();
    });

    it('is empty for an expired token but leaves the cookies alone', async () => {
      const session = await auth(await request(-10));

      expect(session.user).toBeNull();
      expect(authClient.refresh).not.toHaveBeenCalled();
      expect(cookieStore.set).not.toHaveBeenCalled();
      expect(cookieStore.delete).not.toHaveBeenCalled();
    });
  });
});

describe('auth on a local server without SECRET_KEY', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    withSessionCookie('a-session-set-by-sst-dev');
  });

  it('is signed out and leaves the shared localhost cookies alone', async () => {
    const empty = { accessToken: null, expiresAt: null, user: null };
    expect(await auth()).toEqual(empty);
    expect(
      await auth(new NextRequest('http://localhost:3100/api/u/margaux')),
    ).toEqual(empty);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });
});
