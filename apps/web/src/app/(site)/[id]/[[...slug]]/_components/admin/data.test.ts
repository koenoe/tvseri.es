import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchJson } from '@/lib/series/useCachedJson';

import { adminStore } from './adminStore';
import { ensureImages, fetchColours } from './data';

vi.mock('@/lib/series/useCachedJson', () => ({ fetchJson: vi.fn() }));

const SERVED = {
  backdropColor: '#111111',
  backdropPath: '/b0.jpg',
  id: 7,
} as never;

beforeEach(() => {
  vi.mocked(fetchJson).mockReset();
  adminStore.setState({ colours: {}, images: {}, request: null });
});

describe('the tray’s reads', () => {
  it('asks the admin images route for the show', async () => {
    vi.mocked(fetchJson).mockRejectedValue(new Error('502'));
    await ensureImages(SERVED);
    expect(fetchJson).toHaveBeenCalledWith('/api/admin/series/7/images');
    expect(adminStore.getState().images[7]).toEqual({ status: 'error' });
  });

  it('asks the backdrop colours route with one path per backdrop', async () => {
    vi.mocked(fetchJson).mockResolvedValue({ '/b1.jpg': '#585838' });
    await fetchColours(7, ['/b1.jpg', '/b2.jpg']);
    expect(fetchJson).toHaveBeenCalledWith(
      '/api/admin/series/7/backdrop-colours?path=%2Fb1.jpg&path=%2Fb2.jpg',
    );
    expect(adminStore.getState().colours['/b1.jpg']).toBe('#585838');
  });
});
