import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_HEADERS } from '@/app/api/cacheHeaders';
import { loadFamilyAndAwards } from '@/lib/person/loaders';

import { GET } from './route';

vi.mock('@/lib/person/loaders', () => ({
  loadFamilyAndAwards: vi.fn(),
}));

const get = (id: string) =>
  GET(new Request(`https://www.tvseri.es/api/person/${id}/awards`), {
    params: Promise.resolve({ id }),
  });

describe('GET /api/person/:id/awards', () => {
  beforeEach(() => {
    vi.mocked(loadFamilyAndAwards).mockReset();
  });

  it('404s a malformed id without a read', async () => {
    expect((await get('0')).status).toBe(404);
    expect(loadFamilyAndAwards).not.toHaveBeenCalled();
  });

  it('serves the awards on the medium life, none known on the short one', async () => {
    const items = [{ award: 'Emmy' }];
    vi.mocked(loadFamilyAndAwards).mockResolvedValueOnce({
      awards: { items },
      family: null,
    } as never);
    const res = await get('17419');
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.medium);
    expect(await res.json()).toEqual(items);

    vi.mocked(loadFamilyAndAwards).mockResolvedValueOnce({
      awards: null,
      family: null,
    });
    const none = await get('17419');
    expect(none.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
    expect(await none.json()).toEqual([]);
  });

  it('answers an uncached 502 when Wikidata is unavailable', async () => {
    vi.mocked(loadFamilyAndAwards).mockResolvedValue({ unavailable: true });
    const res = await get('17419');
    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
