import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_HEADERS } from '@/app/api/cacheHeaders';
import { loadRuntimes } from '@/lib/series/loaders';

import { GET } from './route';

vi.mock('@/lib/series/loaders', () => ({ loadRuntimes: vi.fn() }));

const get = (id: string) =>
  GET(new Request(`https://www.tvseri.es/api/series/${id}/runtimes`), {
    params: Promise.resolve({ id }),
  });

describe('GET /api/series/:id/runtimes', () => {
  beforeEach(() => {
    vi.mocked(loadRuntimes).mockReset();
  });

  it.each(['abc', '0', '-1', '1.5', '12345678901'])(
    '404s the id %s without a read',
    async (id) => {
      const res = await get(id);

      expect(res.status).toBe(404);
      expect(loadRuntimes).not.toHaveBeenCalled();
    },
  );

  it('serves the runtimes on the short CDN life', async () => {
    vi.mocked(loadRuntimes).mockResolvedValue({ 1: [50, 48] } as never);

    const res = await get('136315');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
    expect(await res.json()).toEqual({ 1: [50, 48] });
    expect(loadRuntimes).toHaveBeenCalledWith(136315);
  });

  it('answers 502 when the API is unavailable or fails', async () => {
    vi.mocked(loadRuntimes).mockResolvedValueOnce({ unavailable: true });
    expect((await get('136315')).status).toBe(502);

    vi.mocked(loadRuntimes).mockRejectedValueOnce(new Error('down'));
    const failed = await get('136315');
    expect(failed.status).toBe(502);
    expect(failed.headers.get('cache-control')).toBeNull();
  });
});
