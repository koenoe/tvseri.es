import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_HEADERS } from '@/app/api/cacheHeaders';
import { loadSeason } from '@/lib/series/loaders';

import { GET } from './route';

vi.mock('@/lib/series/loaders', () => ({ loadSeason: vi.fn() }));

const get = (id: string, season: string) =>
  GET(new Request(`https://www.tvseri.es/api/series/${id}/season/${season}`), {
    params: Promise.resolve({ id, season }),
  });

describe('GET /api/series/:id/season/:season', () => {
  beforeEach(() => {
    vi.mocked(loadSeason).mockReset();
  });

  it.each([
    ['abc', '1'],
    ['0', '1'],
    ['136315', '1000'],
    ['136315', '-1'],
    ['136315', '1a'],
  ])('404s invalid params (%s, %s) without a call', async (id, season) => {
    const res = await get(id, season);

    expect(res.status).toBe(404);
    expect(loadSeason).not.toHaveBeenCalled();
  });

  it('404s an unknown season, kept short on the CDN', async () => {
    vi.mocked(loadSeason).mockResolvedValue(null);

    const res = await get('136315', '9');

    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
    expect(loadSeason).toHaveBeenCalledWith(136315, 9);
  });

  it('answers 502 when the API fails, uncached', async () => {
    vi.mocked(loadSeason).mockRejectedValue(new Error('down'));

    const res = await get('136315', '0');

    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
