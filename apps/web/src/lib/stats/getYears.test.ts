import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

const { apiFetch, cacheLife, cacheTag } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const { getYears } = await import('./getYears');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getYears', () => {
  it('reads the Years list for 5 minutes only: it is current within seconds at the API', async () => {
    apiFetch.mockResolvedValue({ years: [] });
    await getYears('user-1');
    expect(apiFetch).toHaveBeenCalledWith('/user/:id/stats/years', {
      params: { id: 'user-1' },
    });
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('statsCurrent');
    expect(cacheTag).toHaveBeenCalledWith('user:user-1', 'stats:user-1');
  });

  it('turns a failed read into Unavailable', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    expect(isUnavailable(await getYears('user-1'))).toBe(true);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });
});
