import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_HEADERS } from '@/app/api/cacheHeaders';
import { loadPerson, loadShowsView } from '@/lib/person/loaders';

import { GET } from './route';

vi.mock('@/lib/person/loaders', () => ({
  loadPerson: vi.fn(),
  loadShowsView: vi.fn(),
}));

const get = (id: string) =>
  GET(new Request(`https://www.tvseri.es/api/person/${id}/self-credits`), {
    params: Promise.resolve({ id }),
  });

const self = [{ id: 1 }];

describe('GET /api/person/:id/self-credits', () => {
  beforeEach(() => {
    vi.mocked(loadPerson).mockReset();
    vi.mocked(loadShowsView).mockReset();
  });

  it('404s a malformed id without a read', async () => {
    expect((await get('abc')).status).toBe(404);
    expect(loadPerson).not.toHaveBeenCalled();
  });

  it('serves the credits on the page’s medium life, labelled by the person’s gender', async () => {
    vi.mocked(loadPerson).mockResolvedValue({
      person: { gender: 'female', id: 17419 },
      status: 'ok',
    } as never);
    vi.mocked(loadShowsView).mockResolvedValue({ self } as never);

    const res = await get('17419');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.medium);
    expect(await res.json()).toEqual(self);
    expect(loadShowsView).toHaveBeenCalledWith(17419, 'female');
  });

  it('keeps a person nobody knows as a short 404', async () => {
    vi.mocked(loadPerson).mockResolvedValue({ status: 'not-found' });
    const res = await get('17419');
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe(CACHE_HEADERS.short);
  });

  it('answers an uncached 502 when a read is unavailable, never an empty list', async () => {
    vi.mocked(loadPerson).mockResolvedValue({
      person: { id: 17419 },
      status: 'ok',
    } as never);
    vi.mocked(loadShowsView).mockResolvedValue({ unavailable: true });
    const res = await get('17419');
    expect(res.status).toBe(502);
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
