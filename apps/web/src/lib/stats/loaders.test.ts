import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { acrossCacheBoundary } from '@/lib/cache/testing/cacheBoundary';

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
// the real cached loader, seen as Next serves it to another cached scope
vi.mock('@/lib/series/loaders', async (importOriginal) => {
  const loaders = await importOriginal<typeof import('@/lib/series/loaders')>();
  return { ...loaders, loadSeries: acrossCacheBoundary(loaders.loadSeries) };
});

const {
  getProfileCounts,
  getSeriesArt,
  getStatsUser,
  getSummary,
  isUnavailable,
} = await import('./loaders');

const user = {
  createdAt: '2024-11-08T10:00:00.000Z',
  email: 'nina@example.com',
  id: 'user-1',
  role: 'user',
  username: 'nina',
  version: 1,
  watchProviders: [
    { id: 8, logo: 'https://img/n.png', logoPath: '/n.png', name: 'Netflix' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getStatsUser', () => {
  it('trims the user to the public fields, cached 5 minutes (not the sections’ day) with both user tags', async () => {
    apiFetch.mockResolvedValue(user);
    await expect(getStatsUser('nina')).resolves.toEqual({
      createdAt: '2024-11-08T10:00:00.000Z',
      id: 'user-1',
      memberSince: 'Nov 2024',
      username: 'nina',
      watchProviders: [{ id: 8, logo: 'https://img/n.png', name: 'Netflix' }],
    });
    expect(apiFetch).toHaveBeenCalledWith('/user/by-username/:username', {
      notFound: 'null',
      params: { username: 'nina' },
    });
    // a deleted account the CDN still had can't come back for a day
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('statsCurrent');
    expect(cacheTag.mock.calls.flat()).toEqual([
      'username:nina',
      'user:user-1',
      'stats:user-1',
    ]);
  });

  it('says "Member since today" on the day of joining, as the profile does', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    vi.setSystemTime(Date.UTC(2024, 10, 8, 23, 30));
    apiFetch.mockResolvedValue(user);
    await expect(getStatsUser('nina')).resolves.toMatchObject({
      memberSince: 'today',
    });
    vi.setSystemTime(Date.UTC(2024, 10, 9, 0, 30));
    await expect(getStatsUser('nina')).resolves.toMatchObject({
      memberSince: 'Nov 2024',
    });
  });

  it('is null for an unknown username, cached briefly', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(getStatsUser('nobody')).resolves.toBeNull();
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });

  it('is Unavailable when the API is down, cached briefly', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    expect(isUnavailable(await getStatsUser('nina'))).toBe(true);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });

  it('lets a real API error through (a bug, not an outage)', async () => {
    apiFetch.mockRejectedValue(new ApiError(400));
    await expect(getStatsUser('nina')).rejects.toThrow(ApiError);
  });
});

describe('stats segments', () => {
  it('reads a segment for the user and year with the stats profile (fresh a day, owner’s ruling)', async () => {
    apiFetch.mockResolvedValue({ current: {}, previous: {} });
    await getSummary('user-1', 2025);
    expect(apiFetch).toHaveBeenCalledWith('/user/:id/stats/:year/summary', {
      params: { id: 'user-1', year: 2025 },
    });
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('stats');
    expect(cacheTag).toHaveBeenCalledWith('user:user-1', 'stats:user-1');
  });

  it('turns a throttled or failed read into Unavailable', async () => {
    apiFetch.mockRejectedValue(new ApiError(429));
    expect(isUnavailable(await getSummary('user-1', 2025))).toBe(true);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });
});

describe('getProfileCounts', () => {
  it('reads the four counts', async () => {
    apiFetch
      .mockResolvedValueOnce({ count: 5341 })
      .mockResolvedValueOnce({ count: 218 })
      .mockResolvedValueOnce({ count: 6 })
      .mockResolvedValueOnce({ count: 8 });
    await expect(getProfileCounts('user-1')).resolves.toEqual({
      episodes: 5341,
      finished: 218,
      followers: 6,
      following: 8,
    });
    // 5 minutes, not a day: no "0 episodes" held after a first mark
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('statsCurrent');
  });

  it('is Unavailable when one count fails', async () => {
    apiFetch
      .mockResolvedValue({ count: 1 })
      .mockRejectedValueOnce(new ApiError(0));
    expect(isUnavailable(await getProfileCounts('user-1'))).toBe(true);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });
});

describe('getSeriesArt', () => {
  it('keeps the regular seasons and their sizes', async () => {
    apiFetch.mockResolvedValue({
      backdropColor: '#123456',
      backdropImage: 'https://img/b.jpg',
      id: 7,
      posterImage: 'https://img/p.jpg',
      seasons: [
        { numberOfEpisodes: 3, seasonNumber: 0 },
        { numberOfEpisodes: 8, seasonNumber: 1 },
      ],
      slug: 'show',
      title: 'Show',
      titleTreatmentImage: undefined,
    });
    await expect(getSeriesArt(7)).resolves.toMatchObject({
      seasons: [{ episodes: 8, number: 1 }],
      titleTreatmentImage: null,
    });
    // the series read's scope, then the art's
    expect(cacheLife.mock.calls).toEqual([['short'], ['short']]);
  });

  it('is Unavailable when the series read fails, as it reaches us from its cached scope', async () => {
    apiFetch.mockRejectedValue(new ApiError(0, 'ApiTimeout'));
    expect(isUnavailable(await getSeriesArt(7))).toBe(true);
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
  });

  it('is null when the show is gone', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(getSeriesArt(7)).resolves.toBeNull();
  });
});
