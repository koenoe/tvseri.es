// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOwnEpisodeCount } from './hooks';
import MarkingProvider, { useMarkingStoreApi } from './MarkingProvider';

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <MarkingProvider>{children}</MarkingProvider>
);

afterEach(() => {
  document.cookie = '__tvseries_user=; Max-Age=0; Path=/';
  vi.unstubAllGlobals();
});

describe('useOwnEpisodeCount: your own "N episodes" moves with a mark', () => {
  it('adds what this tab saved since the count arrived, on your own profile only, and starts over with a new count', () => {
    document.cookie = '__tvseries_user=nina; Path=/';
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const { rerender, result } = renderHook(
      ({ count, username }) => ({
        shown: useOwnEpisodeCount(username, count),
        store: useMarkingStoreApi(),
      }),
      { initialProps: { count: 277, username: 'nina' }, wrapper },
    );
    expect(result.current.shown).toBe(277);
    act(() => {
      result.current.store.getState().countSaved(1);
    });
    expect(result.current.shown).toBe(278);
    rerender({ count: 277, username: 'juno' });
    expect(result.current.shown).toBe(277);
    rerender({ count: 278, username: 'nina' });
    expect(result.current.shown).toBe(278);
  });
});
