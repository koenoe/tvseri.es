// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import openWhenPrefetched, { PREFETCH_WAIT_MS } from './openWhenPrefetched';

/**
 * Enter-ahead (a race): the answer lands and opens its first result
 * at once, before that page was ever prefetched. Pushed then, Next has no
 * route tree for it and waits for the page's whole dynamic render (seconds
 * on a busy server) before the URL changes; pushed once the prefetch is in,
 * it shows the page's cached shell at once.
 */
describe('openWhenPrefetched', () => {
  let push: ReturnType<typeof vi.fn<(href: string) => void>>;
  let prefetch: ReturnType<typeof vi.fn<(href: string) => void>>;
  let responses: Map<string, () => void>;
  const watch = (pathname: string, onResponse: () => void) => {
    responses.set(pathname, onResponse);
    return () => responses.delete(pathname);
  };
  const open = (fetchedBefore = false) =>
    openWhenPrefetched('/person/17419/bryan-cranston', {
      fetchedBefore: () => fetchedBefore,
      prefetch,
      push,
      watch,
    });

  beforeEach(() => {
    vi.useFakeTimers();
    push = vi.fn();
    prefetch = vi.fn();
    responses = new Map();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a page never prefetched: prefetches it and navigates only once its route has arrived', async () => {
    open();

    expect(prefetch).toHaveBeenCalledWith('/person/17419/bryan-cranston');
    await vi.advanceTimersByTimeAsync(PREFETCH_WAIT_MS - 1);
    expect(push).not.toHaveBeenCalled();

    responses.get('/person/17419/bryan-cranston')?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(push).toHaveBeenCalledExactlyOnceWith(
      '/person/17419/bryan-cranston',
    );
  });

  it('a page this tab already fetched navigates at once', () => {
    open(true);

    expect(push).toHaveBeenCalledExactlyOnceWith(
      '/person/17419/bryan-cranston',
    );
  });

  it(`a prefetch that never answers holds the navigation ${PREFETCH_WAIT_MS} ms at most`, async () => {
    open();

    await vi.advanceTimersByTimeAsync(PREFETCH_WAIT_MS);
    expect(push).toHaveBeenCalledOnce();

    // a late answer navigates no second time
    responses.get('/person/17419/bryan-cranston')?.();
    await vi.advanceTimersByTimeAsync(PREFETCH_WAIT_MS);
    expect(push).toHaveBeenCalledOnce();
    expect(responses.size).toBe(0);
  });

  it('stops watching once it navigated', async () => {
    open();
    responses.get('/person/17419/bryan-cranston')?.();
    await vi.advanceTimersByTimeAsync(PREFETCH_WAIT_MS * 2);

    expect(push).toHaveBeenCalledOnce();
    expect(responses.size).toBe(0);
  });
});
