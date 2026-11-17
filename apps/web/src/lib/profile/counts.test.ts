import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));
vi.mock('next/navigation', () => ({
  unstable_rethrow: () => {},
}));

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

import { readCount, readProfileCounts } from './counts';

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ count: 7 });
});

describe('readCount', () => {
  it('reads each list count from the list endpoint with its list name', async () => {
    expect(await readCount('u1', 'favourites')).toBe(7);
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/list/:list/count', {
      params: { id: 'u1', list: 'favorites' },
    });
    await readCount('u1', 'watchlist');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/list/:list/count', {
      params: { id: 'u1', list: 'watchlist' },
    });
    await readCount('u1', 'watching');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/list/:list/count', {
      params: { id: 'u1', list: 'in_progress' },
    });
  });

  it('reads the people and episode counters from their own paths', async () => {
    await readCount('u1', 'episodes');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/watched/count', {
      params: { id: 'u1' },
    });
    await readCount('u1', 'followers');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/followers/count', {
      params: { id: 'u1' },
    });
  });
});

describe('readProfileCounts', () => {
  it('reads the four counters', async () => {
    apiFetch
      .mockReset()
      .mockResolvedValueOnce({ count: 5341 })
      .mockResolvedValueOnce({ count: 218 })
      .mockResolvedValueOnce({ count: 6 })
      .mockResolvedValueOnce({ count: 8 });
    expect(await readProfileCounts('u-juno')).toEqual({
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
    expect(isUnavailable(await readProfileCounts('u-juno'))).toBe(true);
  });

  it('is Unavailable on a 5xx', async () => {
    apiFetch.mockRejectedValue(new ApiError(503, 'Service Unavailable'));
    expect(isUnavailable(await readProfileCounts('u-juno'))).toBe(true);
  });

  it('still throws what is not an outage (a bug must be seen)', async () => {
    apiFetch.mockRejectedValue(new ApiError(400, 'Bad request'));
    await expect(readProfileCounts('u-juno')).rejects.toThrow();
  });
});
