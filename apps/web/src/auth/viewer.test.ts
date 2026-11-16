import { describe, expect, it, vi } from 'vitest';

import { viewerFromState } from './viewer';

vi.mock('./client', () => ({ getAuthClient: () => ({}) }));

const tokens = { accessToken: 'jwt', expiresAt: 0, refreshToken: 'r' };

describe('viewerFromState', () => {
  it('reads id and role from the verified token, without /me', async () => {
    const verify = vi.fn(async () => ({ id: 'u1', role: 'admin' as const }));
    await expect(
      viewerFromState({ status: 'valid', tokens }, verify),
    ).resolves.toEqual({ accessToken: 'jwt', id: 'u1', role: 'admin' });
    expect(verify).toHaveBeenCalledWith('jwt');
  });

  it('a refreshed session uses the new token', async () => {
    const verify = vi.fn(async () => ({ id: 'u1', role: 'user' as const }));
    await viewerFromState({ cookie: 'c', status: 'refreshed', tokens }, verify);
    expect(verify).toHaveBeenCalledWith('jwt');
  });

  it('is null without a usable session or with a bad token', async () => {
    const verify = vi.fn(async () => null);
    for (const status of ['none', 'invalid', 'stale'] as const) {
      await expect(viewerFromState({ status }, verify)).resolves.toBeNull();
    }
    await expect(
      viewerFromState({ status: 'valid', tokens }, verify),
    ).resolves.toBeNull();
  });
});
