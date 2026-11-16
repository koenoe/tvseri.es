// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  enabled: [] as boolean[],
  view: undefined as object | undefined,
}));
const showToast = vi.hoisted(() => vi.fn());

vi.mock('./hooks', () => ({
  useEnsureSeries: (_id: number, enabled: boolean) => {
    state.enabled.push(enabled);
    return state.view;
  },
}));
vi.mock('@/components/ui/toast/showToast', () => ({ showToast }));

import useIntentSeed, { SEED_TIMEOUT_MS } from './useIntentSeed';

beforeEach(() => {
  vi.useFakeTimers();
  state.view = undefined;
  state.enabled = [];
  showToast.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('useIntentSeed', () => {
  it('runs a click at once when the show is seeded', () => {
    state.view = {};
    const { result } = renderHook(() => useIntentSeed(1));
    const action = vi.fn();
    act(() => {
      void result.current.run(action);
    });
    expect(action).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(false);
  });

  it('queues a click, shows pending, and runs it when the seed lands', () => {
    const { result, rerender } = renderHook(() => useIntentSeed(1));
    const action = vi.fn();
    act(() => {
      void result.current.run(action);
    });
    expect(result.current.pending).toBe(true);
    expect(action).not.toHaveBeenCalled();
    state.view = {};
    act(() => rerender());
    expect(action).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(false);
  });

  it('drops the click with the error toast when the seed never lands, then re-arms', () => {
    const { result } = renderHook(() => useIntentSeed(1));
    const action = vi.fn();
    const onFail = vi.fn();
    act(() => {
      void result.current.run(action, onFail);
    });
    act(() => {
      vi.advanceTimersByTime(SEED_TIMEOUT_MS);
    });
    expect(action).not.toHaveBeenCalled();
    expect(onFail).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error' }),
    );
    expect(result.current.pending).toBe(false);
    expect(state.enabled.at(-1)).toBe(false);
    act(() => result.current.intent());
    expect(state.enabled.at(-1)).toBe(true);
  });
});
