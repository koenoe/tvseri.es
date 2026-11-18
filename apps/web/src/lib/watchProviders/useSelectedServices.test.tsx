// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import type { WatchProvider } from '@tvseri.es/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSelectedServices } from './useSelectedServices';

/**
 * Get started and Settings save services through this one hook: a save that
 * fails after a later one succeeded must not hide what the server has.
 */

type Answer = Readonly<{ ok: boolean }>;
const pending: Array<(answer: Answer) => void> = [];
const sent: Array<ReadonlyArray<string>> = [];

vi.mock('./actions', () => ({
  updateWatchProviders: (
    input: Readonly<{ watchProviders: ReadonlyArray<WatchProvider> }>,
  ) => {
    sent.push(input.watchProviders.map((p) => p.name));
    return new Promise<Answer>((resolve) => pending.push(resolve));
  },
}));
const toast = vi.fn();
vi.mock('@/components/ui/toast/showToast', () => ({
  showToast: (input: unknown) => toast(input),
}));

const service = (id: number, name: string) =>
  ({ id, logo: '', logoPath: '', name }) as WatchProvider;
const A = service(8, 'Netflix');
const B = service(9, 'Prime Video');
const names = (list: ReadonlyArray<WatchProvider>) => list.map((p) => p.name);

beforeEach(() => {
  pending.length = 0;
  sent.length = 0;
  toast.mockClear();
});
afterEach(cleanup);

describe('useSelectedServices', () => {
  it('a save that fails after a later one succeeded keeps what the server has', async () => {
    const { result } = renderHook(() =>
      useSelectedServices([], { undo: false }),
    );
    act(() => result.current.toggle(A));
    act(() => result.current.toggle(B));
    expect(sent).toEqual([['Netflix'], ['Netflix', 'Prime Video']]);

    await act(async () => pending[1]?.({ ok: true }));
    await act(async () => pending[0]?.({ ok: false }));

    expect(names(result.current.selected)).toEqual(['Netflix', 'Prime Video']);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
  });

  it('a thrown save is a failed save: back to the list it started with', async () => {
    const { result } = renderHook(() => useSelectedServices([B]));
    act(() => result.current.toggle(A));
    await act(async () => {
      pending[0]?.(Promise.reject(new Error('offline')) as never);
    });
    expect(names(result.current.selected)).toEqual(['Prime Video']);
  });

  it('`undo: false` leaves out the Undo toast', () => {
    const { result } = renderHook(() =>
      useSelectedServices([], { undo: false }),
    );
    act(() => result.current.toggle(A));
    expect(toast).not.toHaveBeenCalled();
  });

  it('by default each tap offers Undo', () => {
    const { result } = renderHook(() => useSelectedServices([]));
    act(() => result.current.toggle(A));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Added Netflix' }),
    );
  });
});
