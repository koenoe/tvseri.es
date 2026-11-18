import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME, USER_DISPLAY_COOKIE_NAME } from './auth/cookies';
import { encryptToken } from './auth/crypto';
import { config, proxy } from './proxy';

const authClient = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('./auth/client', () => ({ getAuthClient: () => authClient }));

const SESSION = { [SESSION_COOKIE_NAME]: 'x' };
const DISPLAY = { [USER_DISPLAY_COOKIE_NAME]: 'margaux' };
const PREFETCH = { 'next-router-prefetch': '1' };

describe('proxy matcher', () => {
  it.each([
    // Protected user API: always, so logged-out callers get a 401
    ['/api/u/margaux/watched', {}, {}, true],
    ['/api/u/margaux/watched', SESSION, PREFETCH, true],
    ['/api/me/library-ids', {}, {}, true],
    ['/api/admin/series/1396/images', {}, {}, true],
    // Pages: only with a session or display cookie
    ['/', {}, {}, false],
    ['/1396/breaking-bad', SESSION, {}, true],
    ['/u/margaux/stats/2025', DISPLAY, {}, true],
    // ...and never for prefetches
    ['/1396/breaking-bad', SESSION, PREFETCH, false],
    ['/1396/breaking-bad', SESSION, { purpose: 'prefetch' }, false],
    ['/', DISPLAY, PREFETCH, false],
    // A session-reading route has nothing to refresh for an anonymous visitor
    ['/api/region', {}, {}, false],
    // Other API routes refresh for themselves; assets never need a session
    ['/api/tv/1396', SESSION, {}, false],
    ['/api/auth/login', SESSION, {}, false],
    ['/_next/static/chunks/main.js', SESSION, {}, false],
    ['/_next/image', SESSION, {}, false],
    ['/robots.txt', SESSION, {}, false],
    ['/sitemap.xml', SESSION, {}, false],
    ['/favicon.ico', SESSION, {}, false],
    ['/icon.svg', SESSION, {}, false],
  ] as const)(
    '%s with cookies %j and headers %j: %s',
    (url, cookies, headers, expected) => {
      expect(
        unstable_doesMiddlewareMatch({ config, cookies, headers, url }),
      ).toBe(expected);
    },
  );
});

const cookieHeader = (cookies: Record<string, string>) =>
  Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

const request = (path: string, cookies: Record<string, string>) =>
  new NextRequest(`https://www.tvseri.es${path}`, {
    headers: { cookie: cookieHeader(cookies) },
  });

const sessionCookie = (expiresIn: number) =>
  encryptToken({
    accessToken: 'access-1',
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
    refreshToken: 'refresh-1',
  });

describe('proxy', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_KEY', 'test-secret');
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    // apiFetch logs a failed call; Next's console patch needs a request scope
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          createdAt: '2024-01-01T00:00:00.000Z',
          id: 'user-1',
          role: 'user',
          username: 'margaux',
          version: 1,
        }),
      ),
    );
  });

  it('answers 401 on a protected API route without a session', async () => {
    const res = await proxy(request('/api/u/margaux/watched', DISPLAY));

    expect(res.status).toBe(401);
    expect(res.cookies.get(USER_DISPLAY_COOKIE_NAME)?.value).toBe('');
  });

  it('drops an undecryptable session and its display cookie', async () => {
    const res = await proxy(
      request('/', { [SESSION_COOKIE_NAME]: 'garbage', ...DISPLAY }),
    );

    expect(res.status).toBe(200);
    expect(res.cookies.get(SESSION_COOKIE_NAME)?.value).toBe('');
    expect(res.cookies.get(USER_DISPLAY_COOKIE_NAME)?.value).toBe('');
  });

  it('fills in a missing display cookie from /me', async () => {
    const res = await proxy(
      request('/', { [SESSION_COOKIE_NAME]: await sessionCookie(3600) }),
    );

    expect(res.cookies.get(USER_DISPLAY_COOKIE_NAME)).toMatchObject({
      httpOnly: false,
      value: 'margaux',
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('leaves a valid session with its display cookie alone', async () => {
    const res = await proxy(
      request('/', {
        [SESSION_COOKIE_NAME]: await sessionCookie(3600),
        ...DISPLAY,
      }),
    );

    expect(res.cookies.getAll()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refreshes, sets the new session and forwards it to the route', async () => {
    authClient.refresh.mockResolvedValue({
      err: false,
      tokens: { access: 'access-2', expiresIn: 3600, refresh: 'refresh-2' },
    });

    const res = await proxy(
      request('/1396', {
        [SESSION_COOKIE_NAME]: await sessionCookie(30),
        ...DISPLAY,
      }),
    );

    const newCookie = res.cookies.get(SESSION_COOKIE_NAME);
    expect(newCookie).toMatchObject({ httpOnly: true, maxAge: 31536000 });
    expect(newCookie?.value).not.toBe('');
    // A refresh asks /me once: the user still exists, the name is current
    expect(res.cookies.get(USER_DISPLAY_COOKIE_NAME)?.value).toBe('margaux');
    expect(fetch).toHaveBeenCalledOnce();
    // The route sees the new cookie in its request
    expect(res.headers.get('x-middleware-request-cookie')).toContain(
      `${SESSION_COOKIE_NAME}=${newCookie?.value}`,
    );
  });

  // Deleted elsewhere: the issuer still refreshes, the API refuses the user
  it.each([
    ['/1396', 200],
    ['/api/me/library-ids', 401],
  ])('ends the session of a deleted account on %s', async (path, status) => {
    authClient.refresh.mockResolvedValue({
      err: false,
      tokens: { access: 'access-2', expiresIn: 3600, refresh: 'refresh-2' },
    });
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ message: 'AccountGone', status: 401 }, { status: 401 }),
    );

    const res = await proxy(
      request(path, {
        [SESSION_COOKIE_NAME]: await sessionCookie(30),
        ...DISPLAY,
      }),
    );

    expect(res.status).toBe(status);
    expect(res.cookies.get(SESSION_COOKIE_NAME)?.value).toBe('');
    expect(res.cookies.get(USER_DISPLAY_COOKIE_NAME)?.value).toBe('');
  });

  it('keeps the session when /me cannot answer', async () => {
    authClient.refresh.mockResolvedValue({
      err: false,
      tokens: { access: 'access-2', expiresIn: 3600, refresh: 'refresh-2' },
    });
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ message: 'Unauthorized', status: 401 }, { status: 401 }),
    );

    const res = await proxy(
      request('/1396', {
        [SESSION_COOKIE_NAME]: await sessionCookie(30),
        ...DISPLAY,
      }),
    );

    expect(res.cookies.get(SESSION_COOKIE_NAME)?.value).not.toBe('');
    expect(res.cookies.get(USER_DISPLAY_COOKIE_NAME)?.value).toBe('margaux');
  });
});

describe('proxy without auth secrets (a local server)', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('passes requests through untouched instead of failing or deleting cookies', async () => {
    // localhost cookies are shared across ports: a secret-less dev server next
    // to `sst dev` must never rewrite the session `sst dev` set.
    const res = await proxy(
      request('/1396/breaking-bad', { ...SESSION, ...DISPLAY }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('still answers 401 on a protected API route', async () => {
    const res = await proxy(request('/api/u/margaux/watched', SESSION));
    expect(res.status).toBe(401);
  });

  it('is never skipped in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(proxy(request('/', SESSION))).rejects.toThrow('SECRET_KEY');
  });
});
