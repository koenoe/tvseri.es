import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getViewer, readSeriesSeed, loadSeriesForWrite } = vi.hoisted(() => ({
  getViewer: vi.fn(),
  loadSeriesForWrite: vi.fn(),
  readSeriesSeed: vi.fn(),
}));
vi.mock('@/auth/viewer', () => ({ getViewer }));
vi.mock('@/lib/marking/server/seed', () => ({ readSeriesSeed }));
vi.mock('@/lib/series/forWrite', () => ({ loadSeriesForWrite }));

const { GET } = await import('./route');

const VIEWER = { accessToken: 'token-a', id: 'a', role: 'user' };

const get = (id: string) =>
  GET(new NextRequest(`https://www.tvseri.es/api/me/series/${id}`), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  getViewer.mockResolvedValue(VIEWER);
  loadSeriesForWrite.mockResolvedValue({ id: 1396 });
  readSeriesSeed.mockResolvedValue({ seriesId: 1396 });
});

describe('GET /api/me/series/:id', () => {
  it('answers the viewer’s own marking state, privately', async () => {
    const res = await get('1396');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({ seriesId: 1396 });
    expect(readSeriesSeed).toHaveBeenCalledWith(
      VIEWER,
      1396,
      expect.any(Promise),
    );
    expect(loadSeriesForWrite).toHaveBeenCalledWith(1396);
  });

  it.each(['0', '-1', 'abc', '1.5', '123456789'])(
    '404s the id %s without reading anything',
    async (id) => {
      const res = await get(id);
      expect(res.status).toBe(404);
      expect(res.headers.get('cache-control')).toBe('private, no-store');
      expect(readSeriesSeed).not.toHaveBeenCalled();
      expect(loadSeriesForWrite).not.toHaveBeenCalled();
    },
  );

  it('404s a show the API does not know, privately', async () => {
    readSeriesSeed.mockResolvedValue(null);
    const res = await get('999');
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
});
