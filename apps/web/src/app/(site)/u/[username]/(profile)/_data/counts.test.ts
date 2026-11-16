import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

import { loadCounts } from './counts';
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

describe('loadCounts', () => {
  it('reads the four counters', async () => {
    apiFetch
      .mockResolvedValueOnce({ count: 5341 })
      .mockResolvedValueOnce({ count: 218 })
      .mockResolvedValueOnce({ count: 6 })
      .mockResolvedValueOnce({ count: 8 });
    expect(await loadCounts(profile('owner'))).toEqual({
      episodes: 5341,
      finished: 218,
      followers: 6,
      following: 8,
    });
  });

  it('is Unavailable, not a throw, when one read times out', async () => {
    apiFetch
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new ApiError(0, 'ApiTimeout'))
      .mockResolvedValueOnce({ count: 1 });
    expect(isUnavailable(await loadCounts(profile('owner')))).toBe(true);
  });

  it('is Unavailable on a 5xx', async () => {
    apiFetch.mockRejectedValue(new ApiError(503, 'Service Unavailable'));
    expect(isUnavailable(await loadCounts(profile('visitor')))).toBe(true);
  });

  it('still throws what is not an outage (a bug must be seen)', async () => {
    apiFetch.mockRejectedValue(new ApiError(400, 'Bad request'));
    await expect(loadCounts(profile('owner'))).rejects.toThrow();
  });
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
