import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';

const { apiFetch, cacheLife, cacheTag } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const { loadSeries, loadSeriesCredits, loadSeriesOrNull } = await import(
  './loaders'
);

const series = { id: 7, title: 'Show' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loadSeries', () => {
  it('reads the show with its images, cached short and tagged', async () => {
    apiFetch.mockResolvedValue(series);
    await expect(loadSeries(7)).resolves.toEqual(series);
    expect(apiFetch).toHaveBeenCalledWith('/series/:id', {
      notFound: 'null',
      params: { id: 7 },
      query: { include_images: true },
    });
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('short');
    expect(cacheTag).toHaveBeenCalledWith('series:7');
  });

  it('is null for a show the API does not know', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(loadSeries(7)).resolves.toBeNull();
  });

  it.each([
    [0, 'ApiTimeout'],
    [503, undefined],
  ])(
    'answers an outage (%i %s) with Unavailable, cached briefly',
    async (status, code) => {
      apiFetch.mockRejectedValue(new ApiError(status, code));
      expect(isUnavailable(await loadSeries(7))).toBe(true);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
    },
  );

  it('lets a bug through (a 400)', async () => {
    apiFetch.mockRejectedValue(new ApiError(400));
    await expect(loadSeries(7)).rejects.toThrow(ApiError);
  });
});

describe('loadSeriesOrNull', () => {
  it('reads an outage as no show', async () => {
    apiFetch.mockRejectedValue(new ApiError(503));
    await expect(loadSeriesOrNull(7)).resolves.toBeNull();
  });

  it.each([
    ['a 400', new ApiError(400)],
    ['an invalid body', new ApiError(200, 'ApiInvalidResponse')],
  ])('reads %s as no show too, and logs it once', async (_, error) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    apiFetch.mockRejectedValue(error);
    await expect(loadSeriesOrNull(7)).resolves.toBeNull();
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('loadSeriesCredits', () => {
  it('answers null for a show the API doesn’t know', async () => {
    apiFetch.mockResolvedValue(null);
    await expect(loadSeriesCredits(7)).resolves.toBeNull();
  });

  it('reads the credits, kept as the cast alone, cached medium', async () => {
    const cast = [{ id: 1, name: 'Jeremy Allen White' }];
    apiFetch.mockResolvedValue({ cast, crew: [{ id: 2, name: 'Crew' }] });
    await expect(loadSeriesCredits(7)).resolves.toEqual({ cast });
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('medium');
  });

  it('answers an outage with Unavailable, cached briefly', async () => {
    apiFetch.mockRejectedValue(new ApiError(502));
    expect(isUnavailable(await loadSeriesCredits(7))).toBe(true);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('unavailable');
  });
});
