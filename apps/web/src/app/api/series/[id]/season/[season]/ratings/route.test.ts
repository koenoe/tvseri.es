import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_HEADERS } from '@/app/api/cacheHeaders';
import { loadSeasonRatings } from '@/lib/series/loaders';

import { GET } from './route';

vi.mock('@/lib/series/loaders', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/series/loaders')>()),
  loadSeasonRatings: vi.fn(),
}));

const get = (id: string, season: string) =>
  GET(
    new Request(
      `https://www.tvseri.es/api/series/${id}/season/${season}/ratings`,
    ),
    {
      params: Promise.resolve({ id, season }),
    },
  );

describe('GET /api/series/:id/season/:season/ratings', () => {
  beforeEach(() => {
    vi.mocked(loadSeasonRatings).mockReset();
  });

  it('answers the ratings by episode, cached for the medium profile', async () => {
    vi.mocked(loadSeasonRatings).mockResolvedValue({
      ratings: { '1': { imdbRating: 7.9 }, '2': { imdbRating: null } },
    });

    const res = await get('136315', '2');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.medium);
    expect(await res.json()).toEqual({ '1': 7.9, '2': null });
    expect(loadSeasonRatings).toHaveBeenCalledWith(136315, 2);
  });

  it('never stores an empty answer (OMDb may be unavailable)', async () => {
    vi.mocked(loadSeasonRatings).mockResolvedValue({ ratings: {} });

    const res = await get('136315', '3');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({});
  });

  it('404s an unknown show', async () => {
    vi.mocked(loadSeasonRatings).mockResolvedValue(null);

    const res = await get('999', '1');

    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
  });

  it.each([
    ['abc', '1'],
    ['0', '1'],
    ['136315', '100'],
    ['136315', '-1'],
  ])('404s invalid params (%s, %s) without a call', async (id, season) => {
    const res = await get(id, season);

    expect(res.status).toBe(404);
    expect(loadSeasonRatings).not.toHaveBeenCalled();
  });

  it('answers 502 when the API fails, uncached', async () => {
    vi.mocked(loadSeasonRatings).mockRejectedValue(new Error('down'));

    const res = await get('136315', '1');

    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
