import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encryptToken } from './crypto';

/*
 * React's `cache()` only memoizes inside a server request; here one request
 * is one memo table, so the test sees what a page that calls both `auth()`
 * and `getViewer()` costs.
 */
const request = vi.hoisted(() => ({ memo: new Map<unknown, unknown>() }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache:
    <A extends unknown[], R>(fn: (...args: A) => R) =>
    (...args: A): R => {
      const key = JSON.stringify([String(fn), args]);
      if (!request.memo.has(key)) {
        request.memo.set(key, fn(...args));
      }
      return request.memo.get(key) as R;
    },
}));

const authClient = vi.hoisted(() => ({ refresh: vi.fn(), verify: vi.fn() }));
vi.mock('./client', () => ({ getAuthClient: () => authClient }));

const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));

const decrypt = vi.hoisted(() => ({ calls: 0 }));
vi.mock('./crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./crypto')>();
  return {
    ...actual,
    decryptToken: (cookie: string) => {
      decrypt.calls += 1;
      return actual.decryptToken(cookie);
    },
  };
});

const { default: auth } = await import('./index');
const { getViewer } = await import('./viewer');

const NOW_S = Math.floor(Date.now() / 1000);

describe('one request reading the session through auth() and getViewer()', () => {
  beforeEach(async () => {
    request.memo.clear();
    decrypt.calls = 0;
    vi.stubEnv('SECRET_KEY', 'test-secret');
    vi.stubEnv('API_URL', 'https://api.test');
    vi.stubEnv('API_KEY', 'key');
    const value = await encryptToken({
      accessToken: 'access-1',
      expiresAt: NOW_S + 3600,
      refreshToken: 'refresh-1',
    });
    cookieStore.get.mockImplementation((name: string) =>
      name === '__tvseries_session' ? { name, value } : undefined,
    );
    authClient.verify.mockResolvedValue({
      err: false,
      subject: { properties: { id: 'user-1', role: 'user' }, type: 'user' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              createdAt: '2024-01-01T00:00:00.000Z',
              id: 'user-1',
              role: 'user',
              username: 'margaux',
              version: 1,
            }),
            { headers: { 'content-type': 'application/json' } },
          ),
      ),
    );
  });

  it('decrypts the cookie and verifies the token once, never refreshing', async () => {
    const [session, viewer] = await Promise.all([auth(), getViewer()]);

    expect(session.user?.id).toBe('user-1');
    expect(viewer).toEqual({
      accessToken: 'access-1',
      id: 'user-1',
      role: 'user',
    });
    expect(decrypt.calls).toBe(1);
    expect(authClient.verify).toHaveBeenCalledTimes(1);
    expect(authClient.refresh).not.toHaveBeenCalled();
  });
});
