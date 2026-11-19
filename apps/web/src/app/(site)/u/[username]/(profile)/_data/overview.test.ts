import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('server-only', () => ({}));
// the owner's overview sends their region
vi.mock('@/auth', () => ({ default: async () => ({ user: null }) }));
vi.mock('@/lib/geo', () => ({ resolveRegion: async () => 'GB' }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const { loadWaitingFor } = await import('./overview');

const OWNER = {
  accessToken: 'token',
  user: { id: 'u1' },
  viewer: 'owner',
} as never;

const WAITING = { items: [] };

beforeEach(() => {
  apiFetch.mockReset();
});

describe('loadWaitingFor', () => {
  it('takes the waiting shows from the overview: no second computation', async () => {
    apiFetch.mockResolvedValue({ upNext: [], waitingFor: WAITING });

    expect(await loadWaitingFor(OWNER)).toEqual(WAITING);
    expect(apiFetch.mock.calls.map(([path]) => path)).toEqual(['/me/overview']);
  });

  it('fails the block when the overview lacks it, without a second read', async () => {
    apiFetch.mockResolvedValue({ upNext: [] });

    await expect(loadWaitingFor(OWNER)).rejects.toMatchObject({
      code: 'ApiInvalidResponse',
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
