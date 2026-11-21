// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import MarkingProvider, {
  MarkingStoreBridge,
  useMarkingStoreApi,
} from './MarkingProvider';
import type { MarkingStoreApi } from './store';
import useCulmination from './useCulmination';

const SERIES = 7;

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <MarkingProvider>{children}</MarkingProvider>
);

/** Two seasons of two, S1 watched and S2E1: S2E2 completes the show */
const seed = (store: MarkingStoreApi, seriesId = SERIES) =>
  store.getState().seed(
    {
      fetchedAt: 1,
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 2 },
      ],
      seriesId,
      status: null,
      watched: [
        { episodeNumber: 1, seasonNumber: 1, watchedAt: 1 },
        { episodeNumber: 2, seasonNumber: 1, watchedAt: 1 },
        { episodeNumber: 1, seasonNumber: 2, watchedAt: 1 },
      ],
    },
    `seed-${seriesId}`,
  );

/** The hook for `scope`, and the store it reads (the show seeded) */
function mount(scope: 'show' | number) {
  const hook = renderHook(
    (props: Readonly<{ scope: 'show' | number }>) => ({
      play: useCulmination(SERIES, props.scope),
      store: useMarkingStoreApi(),
    }),
    { initialProps: { scope }, wrapper },
  );
  act(() => seed(hook.result.current.store));
  return hook;
}

const storeOf = (hook: ReturnType<typeof mount>) => hook.result.current.store;

/** The viewer's mark of S2E2 and the moment it plays; returns its op id */
function finish(hook: ReturnType<typeof mount>, seasons = [2]) {
  let id = 0;
  act(() => {
    id = storeOf(hook)
      .getState()
      .begin(SERIES, {
        kind: 'mark',
        records: { S02E02: { runtime: 0, watchedAt: 2 } },
      });
    storeOf(hook)
      .getState()
      .culminate({ finished: true, seasons, seriesId: SERIES });
  });
  return id;
}

describe('useCulmination', () => {
  it('plays a finish that happens while it is on screen', () => {
    const hook = mount('show');
    expect(hook.result.current.play).toBeNull();
    finish(hook);
    expect(hook.result.current.play).toEqual(expect.any(Number));
  });

  it('a season plays for that season only', () => {
    const season = mount(2);
    finish(season);
    expect(season.result.current.play).not.toBeNull();

    const other = mount(1);
    finish(other);
    expect(other.result.current.play).toBeNull();
  });

  it('another show’s finish is not this one’s', () => {
    const hook = mount('show');
    act(() => {
      seed(storeOf(hook), 8);
      storeOf(hook)
        .getState()
        .culminate({ finished: true, seasons: [], seriesId: 8 });
    });
    expect(hook.result.current.play).toBeNull();
  });

  it('never plays what happened before it mounted (a finish from a tile, then the show opens)', () => {
    const first = mount('show');
    finish(first);
    // the same tab's store, a new component on it
    const later = renderHook(() => useCulmination(SERIES, 'show'), {
      wrapper: MarkingStoreBridge,
    });
    expect(later.result.current).toBeNull();
  });

  it('switching back to a season it completed earlier plays nothing', () => {
    const hook = mount(2);
    finish(hook);
    hook.rerender({ scope: 1 });
    expect(hook.result.current.play).toBeNull();
    hook.rerender({ scope: 2 });
    expect(hook.result.current.play).toBeNull();
  });

  it('once it is undone, it is over: complete again with no new moment (Undo, Try again) plays nothing', () => {
    const hook = mount('show');
    const id = finish(hook);
    expect(hook.result.current.play).not.toBeNull();
    // the write failed, or an unmark then its Undo: incomplete, then complete
    act(() => storeOf(hook).getState().fail(SERIES, id));
    expect(hook.result.current.play).toBeNull();
    act(() => {
      storeOf(hook)
        .getState()
        .begin(SERIES, {
          kind: 'mark',
          records: { S02E02: { runtime: 0, watchedAt: 3 } },
        });
    });
    expect(hook.result.current.play).toBeNull();
  });
});
