import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { orFallback } = await import('./orFallback');

describe('orFallback', () => {
  it('returns the read, or the fallback when it fails', async () => {
    expect(await orFallback(Promise.resolve(1), 0, 'x')).toBe(1);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await orFallback(Promise.reject(new Error('down')), 0, 'x')).toBe(0);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('lets Next’s own interruptions through', async () => {
    const notFound = Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), {
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    });
    await expect(orFallback(Promise.reject(notFound), 0, 'x')).rejects.toBe(
      notFound,
    );
  });
});
