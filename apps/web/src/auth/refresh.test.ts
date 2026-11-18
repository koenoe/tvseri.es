import {
  InvalidAccessTokenError,
  InvalidRefreshTokenError,
} from '@openauthjs/openauth/error';
import { describe, expect, it, vi } from 'vitest';

import { createRefresher, type RefresherDeps } from './refresh';

const NOW_MS = 1_800_000_000_000;
const NOW = NOW_MS / 1000;

const ISSUED = {
  err: false as const,
  tokens: { access: 'new-access', expiresIn: 3600, refresh: 'new-refresh' },
};

const NEW_TOKENS = {
  accessToken: 'new-access',
  expiresAt: NOW + 3600,
  refreshToken: 'new-refresh',
};

function setup(
  refresh: RefresherDeps['refresh'],
  clock: { ms: number } = { ms: NOW_MS },
) {
  return createRefresher({ now: () => clock.ms, refresh });
}

/** A refresh call that stays in flight until `settle` is called. */
function pending() {
  let settle: (value: typeof ISSUED) => void = () => {};
  const promise = new Promise<typeof ISSUED>((resolve) => {
    settle = resolve;
  });
  return { promise, settle: () => settle(ISSUED) };
}

describe('createRefresher', () => {
  describe('outcomes', () => {
    it('is refreshed with the new tokens, their expiry made absolute', async () => {
      const refresh = setup(vi.fn().mockResolvedValue(ISSUED));

      await expect(refresh('old-refresh')).resolves.toEqual({
        kind: 'refreshed',
        tokens: NEW_TOKENS,
      });
    });

    it('is rejected when the auth server refuses the refresh token', async () => {
      const refresh = setup(
        vi.fn().mockResolvedValue({ err: new InvalidRefreshTokenError() }),
      );

      await expect(refresh('old-refresh')).resolves.toEqual({
        kind: 'rejected',
      });
    });

    it.each([
      ['a network error', new TypeError('fetch failed')],
      ['a timeout', new DOMException('timed out', 'TimeoutError')],
      ['a 5xx or 429', new Error('Auth server responded with 503')],
    ])(
      'is unavailable on %s (never a verdict on the session)',
      async (_, error) => {
        const refresh = setup(vi.fn().mockRejectedValue(error));

        await expect(refresh('old-refresh')).resolves.toEqual({
          error,
          kind: 'unavailable',
        });
      },
    );

    it.each([
      ['no tokens', { err: false }],
      ['an incomplete token answer', { err: false, tokens: { access: 'a' } }],
      [
        'an error other than a refused token',
        { err: new InvalidAccessTokenError() },
      ],
    ])('is unavailable on %s (not a verdict either)', async (_, answer) => {
      const refresh = setup(vi.fn().mockResolvedValue(answer));

      await expect(refresh('old-refresh')).resolves.toMatchObject({
        kind: 'unavailable',
      });
    });
  });

  describe('one refresh per refresh token', () => {
    it('shares one call between concurrent refreshes of the same token', async () => {
      const call = pending();
      const client = vi.fn().mockReturnValue(call.promise);
      const refresh = setup(client);

      const results = Promise.all([
        refresh('old-refresh'),
        refresh('old-refresh'),
        refresh('old-refresh'),
      ]);
      call.settle();

      expect(await results).toEqual(
        Array(3).fill({ kind: 'refreshed', tokens: NEW_TOKENS }),
      );
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('answers a refresh shortly after from the same result', async () => {
      const clock = { ms: NOW_MS };
      const client = vi.fn().mockResolvedValue(ISSUED);
      const refresh = setup(client, clock);

      await refresh('old-refresh');
      clock.ms += 29_000;
      await refresh('old-refresh');

      expect(client).toHaveBeenCalledTimes(1);
    });

    it('remembers a rejection too, so a burst with a dead token asks once', async () => {
      const client = vi
        .fn()
        .mockResolvedValue({ err: new InvalidRefreshTokenError() });
      const refresh = setup(client);

      await refresh('dead-refresh');
      await refresh('dead-refresh');

      expect(client).toHaveBeenCalledTimes(1);
    });

    it('asks the auth server again once the result is older than 30 s', async () => {
      const clock = { ms: NOW_MS };
      const client = vi.fn().mockResolvedValue(ISSUED);
      const refresh = setup(client, clock);

      await refresh('old-refresh');
      clock.ms += 30_001;
      await refresh('old-refresh');

      expect(client).toHaveBeenCalledTimes(2);
    });

    it('never remembers an unavailable answer: the next request tries again', async () => {
      const client = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(ISSUED);
      const refresh = setup(client);

      await expect(refresh('old-refresh')).resolves.toMatchObject({
        kind: 'unavailable',
      });
      await expect(refresh('old-refresh')).resolves.toMatchObject({
        kind: 'refreshed',
      });
    });

    it('keeps different refresh tokens apart', async () => {
      const client = vi.fn().mockResolvedValue(ISSUED);
      const refresh = setup(client);

      await Promise.all([refresh('refresh-a'), refresh('refresh-b')]);

      // each token asks once; the order they leave in is up to the digest
      // that keys them (async, so two in flight finish in either order)
      expect(client).toHaveBeenCalledTimes(2);
      expect(client).toHaveBeenCalledWith('refresh-a');
      expect(client).toHaveBeenCalledWith('refresh-b');
    });

    it('stays bounded: old results are dropped beyond the cap', async () => {
      const client = vi.fn().mockResolvedValue(ISSUED);
      const refresh = createRefresher(
        { now: () => NOW_MS, refresh: client },
        { maxEntries: 2 },
      );

      await refresh('refresh-a');
      await refresh('refresh-b');
      await refresh('refresh-c');
      await refresh('refresh-a');

      expect(client).toHaveBeenCalledTimes(4);
    });
  });
});
