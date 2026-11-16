import { CACHE_LIFE } from '@tvseri.es/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

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

const { getStatsTimeZone } = await import('./timeZone');
const { isUnavailable } = await import('@/lib/cache/unavailable');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getStatsTimeZone', () => {
  it('reads the zone the user’s stats count in, validated, short-lived and tagged with the user’s stats', async () => {
    apiFetch.mockResolvedValue({ timeZone: 'Europe/London' });
    await expect(getStatsTimeZone('user-1')).resolves.toBe('Europe/London');
    expect(apiFetch).toHaveBeenCalledWith('/user/:id/stats/zone', {
      params: { id: 'user-1' },
      schema: expect.anything(),
    });
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('statsCurrent');
    expect(cacheTag).toHaveBeenCalledWith('user:user-1', 'stats:user-1');
  });

  it('is Unavailable when the API is down, cached briefly', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    expect(isUnavailable(await getStatsTimeZone('user-1'))).toBe(true);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });
});

describe('the statsCurrent profile', () => {
  it('revalidates after 5 minutes and stays in the prerendered shell', () => {
    const { maxAge, sMaxAge, staleWhileRevalidate } = CACHE_LIFE.statsCurrent;
    // The Stats page's revalidate is its shortest read: 300 s
    expect(sMaxAge).toBe(300);
    // Next leaves a cache out of the shell when `stale` < 300 s or
    // `expire` < 300 s (cacheLife.md, "Prerendering behavior")
    expect(maxAge).toBeGreaterThanOrEqual(300);
    expect(sMaxAge + staleWhileRevalidate).toBeGreaterThanOrEqual(300);
    // Every other profile on the page is longer, so this one sets it
    expect(CACHE_LIFE.stats.sMaxAge).toBeGreaterThan(sMaxAge);
  });
});
