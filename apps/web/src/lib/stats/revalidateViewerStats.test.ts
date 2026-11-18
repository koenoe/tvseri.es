import { describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('server-only', () => ({}));

const { revalidateViewerStats } = await import('./revalidateViewerStats');

describe('revalidateViewerStats', () => {
  it('marks only the viewer’s stats tag stale (stale-while-revalidate)', () => {
    revalidateViewerStats('user-1');
    // 'max', not updateTag: the action doesn't re-render the current page
    // or purge the browser's router cache
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith(
      'stats:user-1',
      'max',
    );
  });

  it('never throws into the write it follows', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    revalidateTag.mockImplementationOnce(() => {
      throw new Error('cache unavailable');
    });
    expect(() => revalidateViewerStats('user-1')).not.toThrow();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
