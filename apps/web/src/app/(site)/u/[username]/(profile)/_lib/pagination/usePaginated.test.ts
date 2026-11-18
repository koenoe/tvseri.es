// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import usePaginated from './usePaginated';

type Item = Readonly<{ id: number }>;

const reply = (status: number, body?: unknown) =>
  Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );

// Stable props, as a server render gives them
const FIRST: ReadonlyArray<Item> = [{ id: 1 }];
const getId = (item: Item) => item.id;

const start = (fetch: typeof globalThis.fetch) => {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() =>
    usePaginated<Item>({
      endpoint: '/api/u/juno/list/watchlist',
      getId,
      initialCursor: 'c1',
      initialItems: FIRST,
    }),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePaginated', () => {
  it('appends the next page without duplicates and stops at the end', async () => {
    const fetch = vi.fn(() =>
      reply(200, { items: [{ id: 1 }, { id: 2 }], nextCursor: null }),
    );
    const { result } = start(fetch);
    await act(() => result.current.loadMore());
    expect(fetch).toHaveBeenCalledWith('/api/u/juno/list/watchlist?cursor=c1');
    expect(result.current.items.map((item) => item.id)).toEqual([1, 2]);
    expect(result.current.canLoadMore).toBe(false);
  });

  it('stops on an empty page instead of looping', async () => {
    const { result } = start(
      vi.fn(() => reply(200, { items: [], nextCursor: 'c2' })),
    );
    await act(() => result.current.loadMore());
    expect(result.current.canLoadMore).toBe(false);
  });

  it('stops for good when the session is gone', async () => {
    const { result } = start(vi.fn(() => reply(401)));
    await act(() => result.current.loadMore());
    expect(result.current.status).toBe('unauthorized');
    expect(result.current.canLoadMore).toBe(false);
  });

  it('retries after a failure', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => reply(500))
      .mockImplementationOnce(() =>
        reply(200, { items: [{ id: 2 }], nextCursor: null }),
      );
    const { result } = start(fetch);
    await act(() => result.current.loadMore());
    expect(result.current.status).toBe('error');
    await act(() => result.current.loadMore());
    expect(result.current.status).toBe('idle');
    expect(result.current.items.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe('usePaginated, pages above the first', () => {
  const MIDDLE: ReadonlyArray<Item> = [{ id: 5 }, { id: 6 }];

  const startJumped = (fetch: typeof globalThis.fetch, restoreKey?: string) => {
    vi.stubGlobal('fetch', fetch);
    return renderHook(() =>
      usePaginated<Item>({
        endpoint: '/api/u/juno/library/finished?sort=az',
        getId,
        initialCursor: 'n1',
        initialItems: MIDDLE,
        initialPrevCursor: 'p1',
        restoreKey,
      }),
    );
  };

  it('prepends the page above, in list order, and stops at the top', async () => {
    const fetch = vi.fn(() =>
      reply(200, {
        items: [{ id: 3 }, { id: 4 }, { id: 5 }],
        nextCursor: 'ignored',
        prevCursor: null,
      }),
    );
    const { result } = startJumped(fetch);
    expect(result.current.canLoadBefore).toBe(true);
    await act(() => result.current.loadBefore());
    expect(fetch).toHaveBeenCalledWith(
      '/api/u/juno/library/finished?sort=az&before=p1',
    );
    expect(result.current.items.map((item) => item.id)).toEqual([3, 4, 5, 6]);
    expect(result.current.canLoadBefore).toBe(false);
    // the pages below keep their cursor
    expect(result.current.canLoadMore).toBe(true);
  });

  it('keeps paging up while there is more above', async () => {
    const fetch = vi.fn(() =>
      reply(200, { items: [{ id: 4 }], nextCursor: null, prevCursor: 'p2' }),
    );
    const { result } = startJumped(fetch);
    await act(() => result.current.loadBefore());
    expect(result.current.prevCursor).toBe('p2');
    expect(result.current.canLoadBefore).toBe(true);
  });

  it('runs onPrepend just before the items above land', async () => {
    const seen: number[][] = [];
    const { result } = startJumped(
      vi.fn(() =>
        reply(200, { items: [{ id: 4 }], nextCursor: null, prevCursor: null }),
      ),
    );
    await act(() =>
      result.current.loadBefore({
        onPrepend: () => {
          seen.push(result.current.items.map((item) => item.id));
        },
      }),
    );
    expect(seen).toEqual([[5, 6]]);
    expect(result.current.items.map((item) => item.id)).toEqual([4, 5, 6]);
  });

  it('keeps a page loaded below while one above was in flight', async () => {
    let answerAbove: (value: Response) => void = () => {};
    const fetch = vi.fn((url: string) =>
      url.includes('before=')
        ? new Promise<Response>((resolve) => {
            answerAbove = resolve;
          })
        : reply(200, { items: [{ id: 7 }], nextCursor: null }),
    );
    const { result } = startJumped(fetch as unknown as typeof globalThis.fetch);
    let above: Promise<void> = Promise.resolve();
    act(() => {
      above = result.current.loadBefore();
    });
    await act(() => result.current.loadMore());
    await act(async () => {
      answerAbove(
        new Response(
          JSON.stringify({
            items: [{ id: 4 }],
            nextCursor: null,
            prevCursor: null,
          }),
        ),
      );
      await above;
    });
    expect(result.current.items.map((item) => item.id)).toEqual([4, 5, 6, 7]);
  });

  it('stops both ways when the session is gone while prepending', async () => {
    const { result } = startJumped(vi.fn(() => reply(401)));
    await act(() => result.current.loadBefore());
    expect(result.current.beforeStatus).toBe('unauthorized');
    expect(result.current.canLoadBefore).toBe(false);
    expect(result.current.canLoadMore).toBe(false);
  });

  it('fails a prepend alone and retries it', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => reply(500))
      .mockImplementationOnce(() =>
        reply(200, { items: [{ id: 4 }], nextCursor: null, prevCursor: null }),
      );
    const { result } = startJumped(fetch);
    await act(() => result.current.loadBefore());
    expect(result.current.beforeStatus).toBe('error');
    expect(result.current.status).toBe('idle');
    expect(result.current.canLoadMore).toBe(true);
    await act(() => result.current.loadBefore());
    expect(result.current.items.map((item) => item.id)).toEqual([4, 5, 6]);
  });

  it('restores what was loaded above and below on Back', async () => {
    const fetch = vi.fn((url: string) =>
      reply(
        200,
        url.includes('before=')
          ? { items: [{ id: 4 }], nextCursor: null, prevCursor: null }
          : { items: [{ id: 7 }], nextCursor: null },
      ),
    );
    const first = startJumped(
      fetch as unknown as typeof globalThis.fetch,
      'finished-az',
    );
    await act(() => first.result.current.loadBefore());
    await act(() => first.result.current.loadMore());
    first.unmount();

    const again = startJumped(
      fetch as unknown as typeof globalThis.fetch,
      'finished-az',
    );
    expect(again.result.current.items.map((item) => item.id)).toEqual([
      4, 5, 6, 7,
    ]);
    expect(again.result.current.canLoadBefore).toBe(false);
    expect(again.result.current.canLoadMore).toBe(false);
  });
});
