import type { Person, TvSeries } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_HEADERS } from '@/app/api/cacheHeaders';
import { loadSeries, loadSeriesCredits } from '@/lib/series/loaders';

import { GET } from './route';

vi.mock('@/lib/series/loaders', () => ({
  loadSeries: vi.fn(),
  loadSeriesCredits: vi.fn(),
}));

const person = (id: number, name: string, character = ''): Person => ({
  character,
  id,
  image: `${id}.jpg`,
  job: '',
  name,
  numberOfEpisodes: 1,
  slug: name.toLowerCase().replace(/ /g, '-'),
});

const SERIES = {
  createdBy: [person(1, 'Christopher Storer')],
  isAdult: false,
} as TvSeries;

const get = (id: string) =>
  GET(new Request(`https://www.tvseri.es/api/series/${id}/credits`), {
    params: Promise.resolve({ id }),
  });

describe('GET /api/series/:id/credits', () => {
  beforeEach(() => {
    vi.mocked(loadSeries).mockReset();
    vi.mocked(loadSeriesCredits).mockReset();
  });

  it.each(['abc', '0', '-1', '1.5', '12345678901'])(
    '404s the id %s without a read',
    async (id) => {
      const res = await get(id);

      expect(res.status).toBe(404);
      expect(loadSeries).not.toHaveBeenCalled();
      expect(loadSeriesCredits).not.toHaveBeenCalled();
    },
  );

  it('serves the creators, then the cast, trimmed, on the short CDN life', async () => {
    vi.mocked(loadSeries).mockResolvedValue(SERIES);
    vi.mocked(loadSeriesCredits).mockResolvedValue({
      cast: [person(2, 'Jeremy Allen White', 'Carmy Berzatto')],
    });

    const res = await get('136315');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
    expect(await res.json()).toEqual([
      {
        id: 1,
        image: '1.jpg',
        name: 'Christopher Storer',
        role: 'Creator',
        slug: 'christopher-storer',
      },
      {
        id: 2,
        image: '2.jpg',
        name: 'Jeremy Allen White',
        role: 'Carmy Berzatto',
        slug: 'jeremy-allen-white',
      },
    ]);
    expect(loadSeriesCredits).toHaveBeenCalledWith(136315);
  });

  it('404s a show the API doesn’t know, or an adult one', async () => {
    vi.mocked(loadSeriesCredits).mockResolvedValue({ cast: [] });
    vi.mocked(loadSeries).mockResolvedValueOnce(null);
    expect((await get('136315')).status).toBe(404);

    vi.mocked(loadSeries).mockResolvedValueOnce({ ...SERIES, isAdult: true });
    const adult = await get('136315');
    expect(adult.status).toBe(404);
    expect(adult.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
  });

  it('answers 502, uncached, when the API is unavailable or fails', async () => {
    vi.mocked(loadSeries).mockResolvedValue(SERIES);
    vi.mocked(loadSeriesCredits).mockResolvedValueOnce({ unavailable: true });
    expect((await get('136315')).status).toBe(502);

    vi.mocked(loadSeriesCredits).mockRejectedValueOnce(new Error('down'));
    const failed = await get('136315');
    expect(failed.status).toBe(502);
    expect(failed.headers.get('cache-control')).toBeNull();
  });
});
