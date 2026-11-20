// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setToastShowing } from '@/components/ui/toast/toastShowing';
import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingOp } from '@/lib/marking/types';
import type { TileView } from '@/lib/profile/tileView';
import { useLiveWatchingTile } from './liveTile';

const SHOW = 42;

const TILE: TileView = {
  addedAt: 1,
  code: 'S01E03',
  hasAired: true,
  heart: false,
  historySeason: 1,
  id: SHOW,
  initial: 'b',
  line: { aired: 100, watched: 67 },
  meta: [{ kind: 'plain', text: '1 to go' }],
  on: {
    favourite: false,
    finished: false,
    hidden: false,
    watching: true,
    watchlist: false,
  },
  posterImage: '',
  slug: 'the-bear',
  title: 'The Bear',
  undated: false,
};

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <MarkingProvider>{children}</MarkingProvider>
);

const mark = (code: string): MarkingOp => ({
  kind: 'mark',
  records: { [code]: { runtime: 0, watchedAt: 1 } },
});

const watched = (episodes: number) =>
  Array.from({ length: episodes }, (_, index) => ({
    episodeNumber: index + 1,
    seasonNumber: 1,
    watchedAt: 1,
  }));

/** A Watching tile and the store the Remote seeds with the show */
function setup() {
  const onFinished = vi.fn();
  const hook = renderHook(
    () => ({
      store: useMarkingStoreApi(),
      tile: useLiveWatchingTile(TILE, true, onFinished),
    }),
    { wrapper },
  );
  const store = () => hook.result.current.store.getState();
  const seed = (episodes: number) =>
    act(() => {
      store().seed(
        {
          fetchedAt: 1,
          seasons: [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }],
          seriesId: SHOW,
          watched: watched(episodes),
        },
        'seed',
      );
    });
  return { onFinished, seed, store };
}

afterEach(() => {
  setToastShowing(false);
});

describe('a Watching tile leaves once its show is finished', () => {
  it('says the mark made here finished it', () => {
    const { onFinished, seed, store } = setup();
    seed(2);
    act(() => {
      setToastShowing(true);
      store().begin(SHOW, mark('S01E03'));
    });
    expect(onFinished).not.toHaveBeenCalled();
    act(() => {
      setToastShowing(false);
    });
    expect(onFinished).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('a show the store first has finished leaves without saying so', () => {
    const { onFinished, seed } = setup();
    seed(3);
    expect(onFinished).toHaveBeenCalledExactlyOnceWith(false);
  });
});
