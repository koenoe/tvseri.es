import { describe, expect, it, vi } from 'vitest';

import { createBulk } from './bulk';
import { createMarkingStore } from './store';
import type { ToastInput } from './toasts';

const IDS = {
  favorites: [7],
  inProgress: [3],
  watched: [7],
  watchlist: [1, 2, 4],
};

function setup(
  answer: (input: {
    op: string;
    items: ReadonlyArray<{ id: number; addedAt?: number }>;
  }) => { done: number[]; failed: number[] } | null,
) {
  const store = createMarkingStore();
  store.getState().setLibrary({ ids: IDS, status: 'ready' });
  const toasts: ToastInput[] = [];
  const bulkLibrary = vi.fn(
    (input: {
      op: string;
      items: ReadonlyArray<{ id: number; addedAt?: number }>;
    }) => {
      const data = answer(input);
      return Promise.resolve(
        data
          ? ({ data, ok: true } as const)
          : ({ error: 'failed', ok: false } as const),
      );
    },
  );
  const promptSignIn = vi.fn();
  const bulk = createBulk({
    // biome-ignore lint/suspicious/noExplicitAny: a test double of the server action
    bulkLibrary: bulkLibrary as any,
    isSignedIn: () => true,
    promptSignIn,
    store,
    toast: (toast) => toasts.push(toast),
  });
  const watchlist = () => {
    const library = store.getState().library;
    return library.status === 'ready' ? library.ids.watchlist : null;
  };
  return { bulk, bulkLibrary, store, toasts, watchlist };
}

const allDone = (input: { items: ReadonlyArray<{ id: number }> }) => ({
  done: input.items.map((item) => item.id),
  failed: [],
});

describe('bulk', () => {
  it('applies at once, sends one action, toasts the count with Undo', async () => {
    const { bulk, bulkLibrary, toasts, watchlist } = setup(allDone);
    const pending = bulk('watchlist-remove', [
      { addedAt: 100, id: 1 },
      { addedAt: 200, id: 2 },
    ]);
    expect(watchlist()).toEqual([4]);
    await expect(pending).resolves.toEqual({ done: [1, 2], failed: [] });
    expect(bulkLibrary).toHaveBeenCalledTimes(1);
    expect(bulkLibrary).toHaveBeenCalledWith({
      items: [
        { addedAt: 100, id: 1 },
        { addedAt: 200, id: 2 },
      ],
      op: 'watchlist-remove',
    });
    expect(toasts.map((toast) => toast.title)).toEqual([
      'Removed 2 series from your watchlist',
    ]);
  });

  it('Undo re-adds with the original dates, quietly, then tells the page', async () => {
    const { bulk, bulkLibrary, toasts, watchlist } = setup(allDone);
    const onUndone = vi.fn();
    await bulk('watchlist-remove', [{ addedAt: 100, id: 1 }], { onUndone });
    toasts[0]?.action?.onClick();
    await vi.waitFor(() => expect(onUndone).toHaveBeenCalled());
    expect(bulkLibrary).toHaveBeenLastCalledWith({
      items: [{ addedAt: 100, id: 1 }],
      op: 'watchlist-add',
    });
    expect(watchlist()).toEqual([1, 2, 4]);
    expect(toasts).toHaveLength(1);
  });

  it('rolls back the shows that failed and offers Try again', async () => {
    const { bulk, bulkLibrary, toasts, watchlist } = setup((input) => ({
      done: [1],
      failed: input.items.map((item) => item.id).filter((id) => id !== 1),
    }));
    const result = await bulk('watchlist-remove', [
      { id: 1 },
      { id: 2 },
      { id: 4 },
    ]);
    expect(result).toEqual({ done: [1], failed: [2, 4] });
    expect(watchlist()).toEqual([2, 4]);
    expect(toasts[0]).toMatchObject({
      action: { label: 'Try again' },
      title: '2 couldn’t be removed',
      tone: 'error',
    });
    toasts[0]?.action?.onClick();
    await vi.waitFor(() => expect(bulkLibrary).toHaveBeenCalledTimes(2));
    expect(bulkLibrary).toHaveBeenLastCalledWith({
      items: [{ id: 2 }, { id: 4 }],
      op: 'watchlist-remove',
    });
  });

  it('puts everything back when the action fails outright', async () => {
    const { bulk, toasts, watchlist } = setup(() => null);
    const result = await bulk('watchlist-remove', [{ id: 1 }, { id: 2 }]);
    expect(result).toEqual({ done: [], failed: [1, 2] });
    expect(watchlist()).toEqual([1, 2, 4]);
    expect(toasts[0]?.tone).toBe('error');
  });

  it('names every op', async () => {
    const { bulk, toasts } = setup(allDone);
    await bulk('favourites-add', [{ id: 1 }, { id: 2 }]);
    await bulk('favourites-remove', [{ id: 7 }]);
    await bulk('hide', [{ id: 3 }, { id: 5 }, { id: 6 }]);
    await bulk('unhide', [{ id: 3 }]);
    expect(toasts.map((toast) => toast.title)).toEqual([
      'Added 2 series to your favourites',
      'Removed 1 series from your favourites',
      'Hid 3 series from in progress',
      'Brought 1 series back to in progress',
    ]);
  });
});
