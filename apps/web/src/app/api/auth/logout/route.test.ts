import { after, NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encryptToken } from '@/auth/crypto';
import { fakeCookieStore, lastWrite } from '@/auth/testing/fakeCookieStore';

import { POST } from './route';

vi.mock('next/headers', async () => {
  const { fakeCookieStore } = await import('@/auth/testing/fakeCookieStore');
  return { cookies: async () => fakeCookieStore };
});

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn(),
}));

function logout(
  form: Record<string, string> = {},
  headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' },
) {
  return POST(
    new NextRequest('https://www.tvseri.es/api/auth/logout', {
      body: new URLSearchParams(form),
      headers,
      method: 'POST',
    }),
  );
}

describe('POST /api/auth/logout', () => {
  beforeEach(async () => {
    vi.stubEnv('SECRET_KEY', 'test-secret');
    vi.stubEnv('AUTH_URL', 'https://auth.test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null)),
    );
    fakeCookieStore.reset({
      __tvseries_session: await encryptToken({
        accessToken: 'access-1',
        expiresAt: 1_800_000_000,
        refreshToken: 'refresh-1',
      }),
      __tvseries_user: 'margaux',
    });
  });

  it('deletes the session and display cookies and sends the visitor home', async () => {
    const res = await logout();

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(lastWrite('__tvseries_session')?.value).toBe('');
    expect(lastWrite('__tvseries_user')?.value).toBe('');
  });

  it('revokes the refresh token after the response', async () => {
    await logout();

    expect(fetch).not.toHaveBeenCalled();
    const revoke = vi.mocked(after).mock.lastCall?.[0];
    await (typeof revoke === 'function' ? revoke() : revoke);

    expect(fetch).toHaveBeenCalledWith(
      'https://auth.test/revoke',
      expect.objectContaining({
        body: new URLSearchParams({ token: 'refresh-1' }),
        method: 'POST',
      }),
    );
  });

  it.each([
    ['/u/margaux', '/u/margaux'],
    ['//evil.com', '/'],
    ['https://evil.com', '/'],
  ])('returns to the form field returnTo=%s', async (returnTo, expected) => {
    const res = await logout({ returnTo });

    expect(res.headers.get('location')).toBe(expected);
  });

  it('still logs out without a session cookie', async () => {
    fakeCookieStore.reset();

    const res = await logout();

    expect(res.status).toBe(303);
    expect(after).not.toHaveBeenCalled();
  });

  it.each(['cross-site', 'same-site'])(
    'refuses a %s form post',
    async (site) => {
      const res = await logout({}, { 'sec-fetch-site': site });

      expect(res.status).toBe(403);
      expect(fakeCookieStore.writes).toEqual([]);
    },
  );
});
