import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiFetch }));

import { readCount } from './counts';

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ count: 7 });
});

describe('readCount', () => {
  it('reads each list count from the list endpoint with its list name', async () => {
    expect(await readCount('u1', 'favourites')).toBe(7);
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/list/:list/count', {
      params: { id: 'u1', list: 'favorites' },
    });
    await readCount('u1', 'watchlist');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/list/:list/count', {
      params: { id: 'u1', list: 'watchlist' },
    });
    await readCount('u1', 'watching');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/list/:list/count', {
      params: { id: 'u1', list: 'in_progress' },
    });
  });

  it('reads the people and episode counters from their own paths', async () => {
    await readCount('u1', 'episodes');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/watched/count', {
      params: { id: 'u1' },
    });
    await readCount('u1', 'followers');
    expect(apiFetch).toHaveBeenLastCalledWith('/user/:id/followers/count', {
      params: { id: 'u1' },
    });
  });
});
