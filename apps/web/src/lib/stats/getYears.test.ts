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

const { getStatsPageYears, getYears } = await import('./getYears');

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

describe('getStatsPageYears', () => {
  const row = (year: number) => ({ episodes: 1, months: [], year });

  it('keeps only years with a Stats page: the API refuses a per-year read before 2000', async () => {
    // A profile with backdated watches (production: 1989 to 1999) lists
    // those years too; reading their weeks or summary is a 400
    apiFetch.mockResolvedValue({
      timeZone: 'UTC',
      undated: 0,
      years: [row(2026), row(2000), row(1999), row(1989)],
    });
    const answer = await getStatsPageYears('user-1');
    expect(isUnavailable(answer)).toBe(false);
    expect(
      isUnavailable(answer) ? [] : answer.years.map(({ year }) => year),
    ).toEqual([2026, 2000]);
  });

  it('passes an outage on', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    expect(isUnavailable(await getStatsPageYears('user-1'))).toBe(true);
  });
});
