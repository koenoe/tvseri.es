// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingOp } from '@/lib/marking/types';
import { useLeaveHiddenOnWatch } from './liveTile';

const SHOW = 42;

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <MarkingProvider>{children}</MarkingProvider>
);

const mark = (code: string): MarkingOp => ({
  kind: 'mark',
  records: { [code]: { runtime: 0, watchedAt: 1 } },
});

function setup() {
  const onWatched = vi.fn();
  const hook = renderHook(
    () => ({
      leave: useLeaveHiddenOnWatch(SHOW, true, onWatched),
      store: useMarkingStoreApi(),
    }),
    { wrapper },
  );
  const store = () => hook.result.current.store.getState();
  act(() => {
    store().seed(
      {
        fetchedAt: 1,
        seasons: [
          { airedEpisodeCount: 1, episodeCount: 1, seasonNumber: 0 },
          { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
        ],
        seriesId: SHOW,
        watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1 }],
      },
      'seed',
    );
  });
  return { onWatched, store };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('a Hidden shelf tile leaves once its show is watched again', () => {
  it('leaves after the mark’s toast', () => {
    vi.useFakeTimers();
    const { onWatched, store } = setup();
    act(() => {
      store().begin(SHOW, mark('S01E02'));
    });
    expect(onWatched).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onWatched).toHaveBeenCalledExactlyOnceWith(SHOW, 'unhide');
  });

  it('stays when the mark fails or is a special', () => {
    vi.useFakeTimers();
    const { onWatched, store } = setup();
    act(() => {
      const id = store().begin(SHOW, mark('S01E02'));
      store().begin(SHOW, mark('S00E01'));
      store().fail(SHOW, id);
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onWatched).not.toHaveBeenCalled();
  });
});
