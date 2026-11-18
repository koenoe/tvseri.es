import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { ApiError } = await import('@/lib/api/client');
const { cacheLife } = await import('next/cache');
const { getLandingCount } = await import('./landingCount');

beforeEach(() => {
  apiFetch.mockReset();
  vi.mocked(cacheLife).mockReset();
});

describe('getLandingCount', () => {
  it('is the facts’ count, cached medium', async () => {
    apiFetch.mockResolvedValueOnce({
      count: 41_800,
      slug: '2010s',
      type: 'decade',
    });
    await expect(getLandingCount('decade', '2010s')).resolves.toBe(41_800);
    expect(cacheLife).toHaveBeenLastCalledWith('medium');
  });

  it('is null for a slug the API doesn’t know', async () => {
    apiFetch.mockResolvedValueOnce(null);
    await expect(getLandingCount('language', 'xx')).resolves.toBeNull();
  });

  it('is Unavailable for seconds when the API can’t answer', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(0, 'ApiNotConfigured'));
    await expect(getLandingCount('decade', '2010s')).resolves.toEqual({
      unavailable: true,
    });
    expect(cacheLife).toHaveBeenLastCalledWith('unavailable');
  });
});
