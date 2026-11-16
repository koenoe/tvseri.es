import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { decryptToken } from '@/auth/crypto';
import { fakeCookieStore, lastWrite } from '@/auth/testing/fakeCookieStore';

import { GET } from './route';

vi.mock('next/headers', async () => {
  const { fakeCookieStore } = await import('@/auth/testing/fakeCookieStore');
  return { cookies: async () => fakeCookieStore };
});

const authClient = vi.hoisted(() => ({
  authorize: vi.fn(),
  exchange: vi.fn(),
}));
vi.mock('@/auth/client', () => ({ getAuthClient: () => authClient }));

const me = vi.hoisted(() => ({ checkUser: vi.fn() }));
vi.mock('@/auth/me', () => me);

const STARTED_AT = Date.parse('2026-11-13T10:00:00Z');
const LOGIN = JSON.stringify({
  returnTo: '/u/margaux',
  startedAt: STARTED_AT,
  state: 'state-1',
  verifier: 'verifier-1',
});

const signedIn = (createdAt: string) => ({
  kind: 'user' as const,
  user: { createdAt, id: 'user-1', role: 'user', username: 'margaux' },
});

const callback = (query: string) =>
  GET(new NextRequest(`https://www.tvseri.es/api/auth/callback${query}`));

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SITE_URL', 'https://www.tvseri.es');
    vi.stubEnv('SECRET_KEY', 'test-secret');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fakeCookieStore.reset({ __tvseries_login: LOGIN, __tvseries_user: 'old' });
    authClient.exchange.mockResolvedValue({
      err: false,
      tokens: { access: 'access-1', expiresIn: 3600, refresh: 'refresh-1' },
    });
    authClient.authorize.mockResolvedValue({
      challenge: { state: 'state-2', verifier: 'verifier-2' },
      url: 'https://auth.tvseri.es/authorize?client_id=website&state=state-2',
    });
    // A returning person: the account is a year older than this login
    me.checkUser.mockResolvedValue(signedIn('2025-11-13T10:00:00Z'));
  });

  it('creates the session and returns to where the login started', async () => {
    const res = await callback('?code=code-1&state=state-1');

    expect(authClient.exchange).toHaveBeenCalledWith(
      'code-1',
      'https://www.tvseri.es/api/auth/callback',
      'verifier-1',
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/u/margaux');
    const session = lastWrite('__tvseries_session');
    expect(await decryptToken(session?.value ?? '')).toMatchObject({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    // The header's display cookie comes from the same /me (one per sign-in)
    expect(me.checkUser).toHaveBeenCalledWith('access-1');
    expect(lastWrite('__tvseries_user')?.value).toBe('margaux');
    expect(lastWrite('__tvseries_login')?.value).toBe('');
    // Returning: no welcome toast
    expect(lastWrite('__tvseries_welcome')).toBeUndefined();
  });

  it('marks a sign-in that created the account for the one-time welcome toast', async () => {
    me.checkUser.mockResolvedValue(signedIn('2026-11-13T10:00:42Z'));

    const res = await callback('?code=code-1&state=state-1');

    expect(res.headers.get('location')).toBe('/u/margaux');
    const welcome = lastWrite('__tvseries_welcome');
    expect(welcome?.value).toBe('1');
    expect(welcome?.options).toMatchObject({ httpOnly: false, path: '/' });
  });

  it('still signs in when /me fails: no welcome, the proxy fills the header in later', async () => {
    me.checkUser.mockResolvedValue({ kind: 'unknown' });

    const res = await callback('?code=code-1&state=state-1');

    expect(res.headers.get('location')).toBe('/u/margaux');
    expect(lastWrite('__tvseries_session')?.value).toBeTruthy();
    expect(lastWrite('__tvseries_welcome')).toBeUndefined();
  });

  it.each([
    ['cancelled at Google', 'Google said no', 'google_cancelled'],
    [
      'a Google account without a verified email',
      'Your Google account has no verified email address',
      'google_unverified',
    ],
  ])(
    'restarts the login with a notice when %s, keeping the return path',
    async (_case, description, notice) => {
      // OpenAuth's error redirect carries no state
      const res = await callback(
        `?error=access_denied&error_description=${encodeURIComponent(description)}`,
      );

      expect(res.status).toBe(302);
      const location = new URL(res.headers.get('location') ?? '');
      expect(location.origin).toBe('https://auth.tvseri.es');
      expect(location.searchParams.get('notice')).toBe(notice);
      expect(authClient.exchange).not.toHaveBeenCalled();
      // The new login keeps where the first one was going
      const login = JSON.parse(lastWrite('__tvseries_login')?.value ?? '{}');
      expect(login).toMatchObject({ returnTo: '/u/margaux', state: 'state-2' });
    },
  );

  it('sends the visitor home when the state is not this browser’s login', async () => {
    const res = await callback('?code=code-1&state=other-tab');

    expect(res.headers.get('location')).toBe('/');
    expect(authClient.exchange).not.toHaveBeenCalled();
    expect(lastWrite('__tvseries_login')?.value).toBe('');
    expect(lastWrite('__tvseries_session')).toBeUndefined();
  });

  it.each([
    '?error=server_error&error_description=Something%20went%20wrong',
    '?error=invalid_request',
    '?state=state-1',
  ])('sends %s to the “Sign-in broke” page, never JSON', async (query) => {
    const res = await callback(query);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      '/sign-in/error?returnTo=%2Fu%2Fmargaux',
    );
    expect(res.headers.get('content-type')).toBeNull();
    expect(lastWrite('__tvseries_login')?.value).toBe('');
  });

  it('sends a refused code to the “Sign-in broke” page', async () => {
    authClient.exchange.mockResolvedValue({ err: new Error('invalid_grant') });

    const res = await callback('?code=code-1&state=state-1');

    expect(res.headers.get('location')).toBe(
      '/sign-in/error?returnTo=%2Fu%2Fmargaux',
    );
    expect(lastWrite('__tvseries_session')).toBeUndefined();
  });

  it('sends an unreachable auth server to the “Sign-in broke” page', async () => {
    authClient.exchange.mockRejectedValue(new Error('503'));

    const res = await callback('?code=code-1&state=state-1');

    expect(res.headers.get('location')).toBe(
      '/sign-in/error?returnTo=%2Fu%2Fmargaux',
    );
  });

  it('keeps the error page plain when the login was going home', async () => {
    fakeCookieStore.reset({});

    const res = await callback('?error=server_error');

    expect(res.headers.get('location')).toBe('/sign-in/error');
  });
});
