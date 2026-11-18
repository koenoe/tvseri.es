import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthServerFetch } from './authServerFetch';

const authServerFetch = createAuthServerFetch(10_000);

const respondWith = (status: number, body: string | null = null) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(body, { status })),
  );

const INVALID_GRANT = JSON.stringify({
  error: 'invalid_grant',
  error_description: 'Refresh token has been used or expired',
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createAuthServerFetch', () => {
  it.each([500, 502, 503, 429])(
    'throws on %i, so a server problem never reads as a rejected token',
    async (status) => {
      respondWith(status);

      await expect(authServerFetch('https://auth.test/token')).rejects.toThrow(
        String(status),
      );
    },
  );

  it('returns a success for OpenAuth to read', async () => {
    respondWith(200, '{}');

    const response = await authServerFetch('https://auth.test/token');

    expect(response.status).toBe(200);
  });

  it.each([400, 401])(
    'returns a %i invalid_grant from the token endpoint: the one verdict',
    async (status) => {
      respondWith(status, INVALID_GRANT);

      const response = await authServerFetch('https://auth.test/token');

      expect(response.status).toBe(status);
      // OpenAuth still reads the body.
      await expect(response.json()).resolves.toMatchObject({
        error: 'invalid_grant',
      });
    },
  );

  it.each([
    ['a CDN or firewall page', 403, '<html>Forbidden</html>'],
    ['another OAuth error', 400, JSON.stringify({ error: 'invalid_request' })],
    ['an empty answer', 401, null],
    ['a missing route', 404, JSON.stringify({ message: 'Not Found' })],
  ])(
    'throws on %s from the token endpoint (no verdict on the session)',
    async (_, status, body) => {
      respondWith(status, body);

      await expect(authServerFetch('https://auth.test/token')).rejects.toThrow(
        String(status),
      );
    },
  );

  it('leaves a 4xx from other endpoints to OpenAuth', async () => {
    respondWith(404);

    const response = await authServerFetch(
      'https://auth.test/.well-known/jwks.json',
    );

    expect(response.status).toBe(404);
  });

  it('rethrows a network error or timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(
          new DOMException('The operation timed out.', 'TimeoutError'),
        ),
    );

    await expect(authServerFetch('https://auth.test/token')).rejects.toThrow(
      'timed out',
    );
  });

  it('sends every call with a timeout signal', async () => {
    respondWith(200);

    await authServerFetch('https://auth.test/token', { method: 'POST' });

    expect(fetch).toHaveBeenCalledWith(
      'https://auth.test/token',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
