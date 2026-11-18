// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useOpenedOnce from './useOpenedOnce';

describe('useOpenedOnce', () => {
  it('is false until the first opening', () => {
    const { result } = renderHook(({ open }) => useOpenedOnce(open), {
      initialProps: { open: false },
    });
    expect(result.current).toBe(false);
  });

  it('is true from the render that opens, and stays true after closing', () => {
    const { rerender, result } = renderHook(({ open }) => useOpenedOnce(open), {
      initialProps: { open: false },
    });
    rerender({ open: true });
    expect(result.current).toBe(true);
    rerender({ open: false });
    expect(result.current).toBe(true);
  });

  it('is true on the first render when it starts open', () => {
    const { result } = renderHook(({ open }) => useOpenedOnce(open), {
      initialProps: { open: true },
    });
    expect(result.current).toBe(true);
  });
});
