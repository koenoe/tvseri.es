// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useBackCloses from './useBackCloses';

/** jsdom's history.back() is async: run the popstate it would fire */
const back = () =>
  act(async () => {
    window.history.back();
    await new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
  });

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useBackCloses', () => {
  it('pushes one entry while open; Back closes the panel', async () => {
    const close = vi.fn();
    const length = window.history.length;
    renderHook(({ open }) => useBackCloses(open, close), {
      initialProps: { open: true },
    });
    expect(window.history.length).toBe(length + 1);
    await back();
    expect(close).toHaveBeenCalledOnce();
  });

  it('closes with ✕ by going back over its entry, so none stays behind', async () => {
    const close = vi.fn();
    const { result } = renderHook(() => useBackCloses(true, close));
    await act(async () => {
      const popped = new Promise((resolve) =>
        window.addEventListener('popstate', resolve, { once: true }),
      );
      result.current();
      await popped;
    });
    expect(close).toHaveBeenCalledOnce();
    expect(window.history.state).toBeNull();
  });

  it('pushes nothing while closed and closes directly', () => {
    const close = vi.fn();
    const length = window.history.length;
    const { result } = renderHook(() => useBackCloses(false, close));
    expect(window.history.length).toBe(length);
    result.current();
    expect(close).toHaveBeenCalledOnce();
  });
});
