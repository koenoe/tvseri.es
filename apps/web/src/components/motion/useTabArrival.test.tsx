// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { TransitionEvent } from 'react';
import { describe, expect, it } from 'vitest';

import useTabArrival from './useTabArrival';

/** A transition's end, from a rail's tile or from something inside one */
function transitionEnd(from: 'tile' | 'inside', propertyName = 'opacity') {
  const rail = document.createElement('ul');
  const tile = document.createElement('li');
  const inside = document.createElement('a');
  rail.append(tile);
  tile.append(inside);
  const target = from === 'tile' ? tile : inside;
  return {
    currentTarget: rail,
    propertyName,
    target,
  } as unknown as TransitionEvent<HTMLElement>;
}

describe('useTabArrival', () => {
  it('plays nothing for the tab the page drew', () => {
    const { result } = renderHook(() => useTabArrival('crime'));
    expect(result.current).toMatchObject({ arriving: false, key: 'crime' });
  });

  it('plays from the switch until the first tile has risen in', () => {
    const { rerender, result } = renderHook(({ tab }) => useTabArrival(tab), {
      initialProps: { tab: 'crime' },
    });
    rerender({ tab: 'drama' });
    expect(result.current).toMatchObject({ arriving: true, key: 'drama' });
    // a tile's own fades and other properties don't end it
    act(() => result.current.onTransitionEnd(transitionEnd('inside')));
    act(() =>
      result.current.onTransitionEnd(transitionEnd('tile', 'translate')),
    );
    expect(result.current.arriving).toBe(true);
    act(() => result.current.onTransitionEnd(transitionEnd('tile')));
    expect(result.current.arriving).toBe(false);
  });

  it('plays again for a switch back to the first tab', () => {
    const { rerender, result } = renderHook(({ tab }) => useTabArrival(tab), {
      initialProps: { tab: 'crime' },
    });
    rerender({ tab: 'drama' });
    act(() => result.current.onTransitionEnd(transitionEnd('tile')));
    rerender({ tab: 'crime' });
    expect(result.current.arriving).toBe(true);
  });
});
