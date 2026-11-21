// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useSettledEmpty from './useSettledEmpty';

describe('useSettledEmpty', () => {
  it('is empty at once for a lane that loads with nothing', () => {
    const { result } = renderHook(() => useSettledEmpty(0));
    expect(result.current.empty).toBe(true);
  });

  it('waits for the last rows to have gone, then comes back with them', () => {
    const { rerender, result } = renderHook(
      ({ count }) => useSettledEmpty(count),
      { initialProps: { count: 2 } },
    );
    // a row left while another stays: never empty
    act(() => result.current.onSettled());
    expect(result.current.empty).toBe(false);
    rerender({ count: 0 });
    expect(result.current.empty).toBe(false);
    act(() => result.current.onSettled());
    expect(result.current.empty).toBe(true);
    // Undo: the rows are back, and the next last answer waits again
    rerender({ count: 1 });
    expect(result.current.empty).toBe(false);
    rerender({ count: 0 });
    expect(result.current.empty).toBe(false);
  });
});
