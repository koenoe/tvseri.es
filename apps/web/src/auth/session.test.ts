import { InvalidRefreshTokenError } from '@openauthjs/openauth/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { decryptToken, encryptToken } from './crypto';
import { createRefresher, type RefresherDeps } from './refresh';
import { resolveSession, type SessionDeps } from './session';

const NOW_MS = 1_800_000_000_000;
const NOW = NOW_MS / 1000;

const cookieExpiringIn = (seconds: number) =>
  encryptToken({
    accessToken: 'old-access',
    expiresAt: NOW + seconds,
    refreshToken: 'old-refresh',
  });

/** The real refresher (fresh per test) around a fake OpenAuth client. */
function deps(refresh: RefresherDeps['refresh'] = vi.fn()): SessionDeps {
  const now = () => NOW_MS;
  return { now, refresh: createRefresher({ now, refresh }) };
}

const REFRESHED = {
  err: false as const,
  tokens: { access: 'new-access', expiresIn: 3600, refresh: 'new-refresh' },
};

describe('resolveSession', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_KEY', 'test-secret');
  });

  it('is none without a cookie', async () => {
    const state = await resolveSession(
      undefined,
      { context: 'Proxy', mode: 'refresh' },
      deps(),
    );

    expect(state).toEqual({ status: 'none' });
  });

  it('is invalid when the cookie cannot be decrypted', async () => {
    const state = await resolveSession(
      'not-a-session',
      { context: 'Proxy', mode: 'refresh' },
      deps(),
    );

    expect(state).toEqual({ status: 'invalid' });
  });

  it.each(['read-only', 'refresh'] as const)(
    'is valid above the refresh threshold without refreshing (%s)',
    async (mode) => {
      const refresh = vi.fn();
      const state = await resolveSession(
        await cookieExpiringIn(61),
        { context: 'RSC', mode },
        deps(refresh),
      );

      expect(state).toEqual({
        status: 'valid',
        tokens: {
          accessToken: 'old-access',
          expiresAt: NOW + 61,
          refreshToken: 'old-refresh',
        },
      });
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  describe('read-only (RSC) never refreshes', () => {
    it('is valid below the threshold while the token still works', async () => {
      const refresh = vi.fn();
      const state = await resolveSession(
        await cookieExpiringIn(30),
        { context: 'RSC', mode: 'read-only' },
        deps(refresh),
      );

      expect(state.status).toBe('valid');
      expect(refresh).not.toHaveBeenCalled();
    });

    it.each([0, -3600])(
      'is stale when the token expired (expires in %i s)',
      async (seconds) => {
        const refresh = vi.fn();
        const state = await resolveSession(
          await cookieExpiringIn(seconds),
          { context: 'RSC', mode: 'read-only' },
          deps(refresh),
        );

        expect(state).toEqual({ status: 'stale' });
        expect(refresh).not.toHaveBeenCalled();
      },
    );
  });

  describe('refresh mode below the threshold', () => {
    it('refreshes at exactly the threshold and returns the new cookie', async () => {
      const refresh = vi.fn().mockResolvedValue(REFRESHED);
      const state = await resolveSession(
        await cookieExpiringIn(60),
        { context: 'Proxy', mode: 'refresh' },
        deps(refresh),
      );

      expect(refresh).toHaveBeenCalledWith('old-refresh');
      const tokens = {
        accessToken: 'new-access',
        expiresAt: NOW + 3600,
        refreshToken: 'new-refresh',
      };
      expect(state).toMatchObject({ status: 'refreshed', tokens });
      expect(
        state.status === 'refreshed' && (await decryptToken(state.cookie)),
      ).toEqual(tokens);
    });

    it('keeps a still-working session when the auth server is unavailable', async () => {
      const refresh = vi.fn().mockRejectedValue(new Error('503'));
      const state = await resolveSession(
        await cookieExpiringIn(30),
        { context: 'Proxy', mode: 'refresh' },
        deps(refresh),
      );

      expect(state.status).toBe('valid');
    });

    it('keeps an expired session as stale when the auth server is unavailable', async () => {
      const refresh = vi.fn().mockRejectedValue(new Error('timeout'));
      const state = await resolveSession(
        await cookieExpiringIn(-10),
        { context: 'RouteHandler', mode: 'refresh' },
        deps(refresh),
      );

      expect(state).toEqual({ status: 'stale' });
    });

    it('is invalid when the auth server rejects the refresh token', async () => {
      const refresh = vi.fn().mockResolvedValue({
        err: new InvalidRefreshTokenError(),
      });
      const state = await resolveSession(
        await cookieExpiringIn(30),
        { context: 'Proxy', mode: 'refresh' },
        deps(refresh),
      );

      expect(state).toEqual({ status: 'invalid' });
    });

    it('keeps the session when the refresh answer has no tokens (no verdict)', async () => {
      const refresh = vi.fn().mockResolvedValue({ err: false });
      const state = await resolveSession(
        await cookieExpiringIn(30),
        { context: 'Proxy', mode: 'refresh' },
        deps(refresh),
      );

      expect(state.status).toBe('valid');
    });

    it('refreshes once for concurrent requests with the same cookie', async () => {
      const refresh = vi.fn().mockResolvedValue(REFRESHED);
      const shared = deps(refresh);
      const cookie = await cookieExpiringIn(-10);

      const states = await Promise.all(
        (['Proxy', 'RouteHandler', 'Proxy'] as const).map((context) =>
          resolveSession(cookie, { context, mode: 'refresh' }, shared),
        ),
      );

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(states.map(({ status }) => status)).toEqual([
        'refreshed',
        'refreshed',
        'refreshed',
      ]);
    });
  });
});
