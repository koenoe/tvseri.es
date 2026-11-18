import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encryptToken } from '@/auth/crypto';
import { fakeCookieStore, lastWrite } from '@/auth/testing/fakeCookieStore';

import { GET } from './route';

vi.mock('next/headers', async () => {
  const { fakeCookieStore } = await import('@/auth/testing/fakeCookieStore');
  return { cookies: async () => fakeCookieStore };
});

const authClient = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock('@/auth/client', () => ({ getAuthClient: () => authClient }));

// `/me` for a signed-in visitor (`checkUser`)
const userCheck = vi.hoisted(() => vi.fn());
vi.mock('@/auth/me', () => ({ checkUser: userCheck }));

// deleteSession revokes the refresh token after the response
const after = vi.hoisted(() => vi.fn());
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));

const AUTHORIZE_URL = 'https://auth.tvseri.es/authorize?client_id=website';

function login(
  query = '',
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {},
) {
  fakeCookieStore.reset(cookies);
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return GET(
    // The Host is the attacker's: the callback URL must not follow it.
    new NextRequest(`https://evil.example/api/auth/login${query}`, {
      headers: { ...headers, cookie },
    }),
  );
}

const loginState = () =>
  JSON.parse(lastWrite('__tvseries_login')?.value ?? '{}');

describe('GET /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SITE_URL', 'https://www.tvseri.es');
    vi.stubEnv('SECRET_KEY', 'test-secret');
    userCheck.mockResolvedValue({
      kind: 'user',
      user: { id: 'user-1', username: 'margaux' },
    });
    authClient.authorize.mockResolvedValue({
      challenge: { state: 'state-1', verifier: 'verifier-1' },
      url: AUTHORIZE_URL,
    });
  });

  it('remembers the login in a cookie and redirects to the auth server', async () => {
    const res = await login('?returnTo=/u/margaux');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(AUTHORIZE_URL);
    expect(authClient.authorize).toHaveBeenCalledWith(
      'https://www.tvseri.es/api/auth/callback',
      'code',
      { pkce: true },
    );
    const written = lastWrite('__tvseries_login');
    expect(written?.options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        maxAge: 600,
        path: '/api/auth/callback',
        sameSite: 'lax',
      }),
    );
    expect(JSON.parse(written?.value ?? '{}')).toEqual({
      returnTo: '/u/margaux',
      // When the login started: the callback tells a first sign-in by it
      startedAt: expect.any(Number),
      state: 'state-1',
      verifier: 'verifier-1',
    });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it.each([
    ['?returnTo=//evil.com', '/'],
    ['?returnTo=/%5Cevil.com', '/'],
    ['?returnTo=javascript:alert(1)', '/'],
    ['?returnTo=/1396/severance?season=2', '/1396/severance?season=2'],
  ])('sanitises returnTo %s', async (query, expected) => {
    await login(query);

    expect(loginState().returnTo).toBe(expected);
  });

  it('falls back to the same-origin Referer', async () => {
    await login('', {
      referer: 'https://evil.example/1396/severance?season=2',
    });

    expect(loginState().returnTo).toBe('/1396/severance?season=2');
  });

  it.each(['https://other.example/u/margaux', 'not a url'])(
    'ignores the Referer %s',
    async (referer) => {
      await login('', { referer });

      expect(loginState().returnTo).toBe('/');
    },
  );

  it('prefers returnTo over the Referer', async () => {
    await login('?returnTo=/settings', {
      referer: 'https://evil.example/u/margaux',
    });

    expect(loginState().returnTo).toBe('/settings');
  });

  const signedIn = async () => ({
    __tvseries_session: await encryptToken({
      accessToken: 'a',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      refreshToken: 'r',
    }),
    __tvseries_user: 'margaux',
  });

  it('sends a signed-in visitor straight to returnTo', async () => {
    const res = await login('?returnTo=/u/margaux', {}, await signedIn());

    expect(userCheck).toHaveBeenCalledWith('a');
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/u/margaux');
    expect(authClient.authorize).not.toHaveBeenCalled();
  });

  // Deleted in another browser: the token still works at the issuer, but the
  // API refuses its user. Going back would loop on the page's Sign in.
  it('signs a gone user out and starts a real sign-in', async () => {
    userCheck.mockResolvedValue({ kind: 'gone' });

    const res = await login('?returnTo=/settings', {}, await signedIn());

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(AUTHORIZE_URL);
    expect(lastWrite('__tvseries_session')?.value).toBe('');
    expect(lastWrite('__tvseries_user')?.value).toBe('');
    expect(after).toHaveBeenCalledTimes(1);
    expect(loginState().returnTo).toBe('/settings');
  });

  // An outage is no reason to end the session, nor to send the visitor back
  // to a page that asked them to sign in
  it('starts a sign-in, keeping the session, when /me cannot answer', async () => {
    userCheck.mockResolvedValue({ kind: 'unknown' });

    const res = await login('?returnTo=/settings', {}, await signedIn());

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(AUTHORIZE_URL);
    expect(lastWrite('__tvseries_session')).toBeUndefined();
    expect(lastWrite('__tvseries_user')).toBeUndefined();
  });

  it.each<Record<string, string>>([
    { 'next-router-prefetch': '1' },
    { purpose: 'prefetch' },
    { 'sec-purpose': 'prefetch' },
  ])('does nothing for a prefetch (%j)', async (headers) => {
    const res = await login('?returnTo=/u/margaux', headers);

    expect(res.status).toBe(204);
    expect(fakeCookieStore.writes).toEqual([]);
    expect(authClient.authorize).not.toHaveBeenCalled();
  });
});
