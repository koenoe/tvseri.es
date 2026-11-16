// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { bumpCounts, useShelfCount, useShelfCounts } from './counts';

const COUNTS = {
  all: 10,
  favourites: 3,
  finished: 4,
  hidden: 1,
  watching: 2,
  watchlist: 5,
};

describe('useShelfCounts', () => {
  it('adds the changes made after the counts arrived', () => {
    const { result } = renderHook(() => useShelfCounts('nina', COUNTS));
    act(() => {
      bumpCounts('nina', { hidden: 1, watching: -1 });
      bumpCounts('juno', { watchlist: -3 });
    });
    expect(result.current).toEqual({ ...COUNTS, hidden: 2, watching: 1 });
  });

  it('starts over with new counts, and never goes below 0', () => {
    const { rerender, result } = renderHook(
      ({ counts }) => useShelfCounts('rae', counts),
      { initialProps: { counts: COUNTS } },
    );
    act(() => {
      bumpCounts('rae', { watchlist: -9 });
    });
    expect(result.current?.watchlist).toBe(0);
    rerender({ counts: { ...COUNTS, watchlist: 1 } });
    expect(result.current?.watchlist).toBe(1);
  });

  it('keeps a visitor’s Hidden unknown', () => {
    const visitor = { ...COUNTS, hidden: null };
    const { result } = renderHook(() => useShelfCounts('ivo', visitor));
    act(() => {
      bumpCounts('ivo', { hidden: 2 });
    });
    expect(result.current?.hidden).toBeNull();
  });
});

describe('useShelfCount: the sidebar’s “N finished” is the shelf’s number', () => {
  it('adds the shelf changes made after the count arrived, and starts over with a new one', () => {
    const { rerender, result } = renderHook(
      ({ count }) => useShelfCount('lev', 'finished', count),
      { initialProps: { count: 19 } },
    );
    act(() => {
      bumpCounts('lev', { finished: 1, watching: -1 });
    });
    expect(result.current).toBe(20);
    rerender({ count: 20 });
    expect(result.current).toBe(20);
  });

  it('re-renders only when its own shelf moves', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useShelfCount('mae', 'finished', 7);
    });
    const before = renders;
    act(() => {
      bumpCounts('mae', { watchlist: -1 });
      bumpCounts('kai', { finished: 1 });
    });
    expect(renders).toBe(before);
    act(() => {
      bumpCounts('mae', { finished: 1 });
    });
    expect(renders).toBe(before + 1);
    expect(result.current).toBe(8);
  });
});
