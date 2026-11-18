// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setToastShowing } from '@/components/ui/toast/toastShowing';
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
  setToastShowing(false);
});

describe('a Hidden shelf tile leaves once its show is watched again', () => {
  it('leaves once the mark’s toast has closed', () => {
    const { onWatched, store } = setup();
    act(() => {
      setToastShowing(true);
      store().begin(SHOW, mark('S01E02'));
    });
    expect(onWatched).not.toHaveBeenCalled();
    act(() => {
      setToastShowing(false);
    });
    expect(onWatched).toHaveBeenCalledExactlyOnceWith(SHOW, 'unhide');
  });

  it('stays when Undo closes the toast', () => {
    const { onWatched, store } = setup();
    let id = 0;
    act(() => {
      setToastShowing(true);
      id = store().begin(SHOW, mark('S01E02'));
    });
    act(() => {
      store().fail(SHOW, id);
      setToastShowing(false);
    });
    expect(onWatched).not.toHaveBeenCalled();
  });

  it('stays when the mark fails or is a special', () => {
    const { onWatched, store } = setup();
    act(() => {
      setToastShowing(true);
      const id = store().begin(SHOW, mark('S01E02'));
      store().begin(SHOW, mark('S00E01'));
      store().fail(SHOW, id);
    });
    act(() => {
      setToastShowing(false);
    });
    expect(onWatched).not.toHaveBeenCalled();
  });
});
