import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

import { loadFollowState } from './follow';
import type { Profile } from './profile';

const apiFetch = vi.fn();

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));
vi.mock('next/navigation', () => ({
  unstable_rethrow: () => {},
}));

const profile = (viewer: 'owner' | 'visitor'): Profile =>
  ({
    accessToken: 'token',
    user: { id: 'u-juno', username: 'juno' },
    viewer,
    viewerId: 'u-alex',
  }) as unknown as Profile;

beforeEach(() => {
  apiFetch.mockReset();
});

describe('loadFollowState', () => {
  it('needs no read for the owner', async () => {
    expect(await loadFollowState(profile('owner'))).toEqual({
      following: false,
      followsYou: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('is Unavailable when the follow read hangs past the timeout', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    expect(isUnavailable(await loadFollowState(profile('visitor')))).toBe(true);
  });
});
