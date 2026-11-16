// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import type { CatchingUpItem } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { WatchRecord } from '@/lib/marking/types';
import useLiveCatchingUp from './useLiveCatchingUp';

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <MarkingProvider>{children}</MarkingProvider>
);

const code = (episode: number) => `S01E${String(episode).padStart(2, '0')}`;

const ITEM: CatchingUpItem = {
  episodeRuntimes: Array.from({ length: 8 }, () => 44),
  episodes: Array.from({ length: 8 }, (_, index) => code(7 + index)),
  nextUp: 'S01E07',
  posterImage: '',
  runtime: 44,
  runtimeMinutes: 84 * 44,
  runway: null,
  seriesId: 7,
  slug: 'show',
  title: 'Show',
  waiting: 84,
};

const marks = (from: number, to: number) => ({
  kind: 'mark' as const,
  records: Object.fromEntries(
    Array.from({ length: to - from + 1 }, (_, index) => [
      code(from + index),
      { runtime: 0, watchedAt: 2000 } satisfies WatchRecord,
    ]),
  ),
});

function setup() {
  const { result } = renderHook(
    () => ({ row: useLiveCatchingUp(ITEM), store: useMarkingStoreApi() }),
    { wrapper },
  );
  act(() => {
    result.current.store.getState().seed(
      {
        fetchedAt: 1,
        seasons: [{ airedEpisodeCount: 90, episodeCount: 90, seasonNumber: 1 }],
        seriesId: 7,
        watched: [],
      },
      'seven',
    );
  });
  return result;
}

describe('useLiveCatchingUp', () => {
  it('moves the run on with a mark and back when the write fails', () => {
    const result = setup();
    expect(result.current.row.live).toBe(ITEM);
    let id = 0;
    act(() => {
      id = result.current.store.getState().begin(7, marks(7, 10));
    });
    expect(result.current.row.live).toMatchObject({
      nextUp: 'S01E11',
      runtimeMinutes: 80 * 44,
      waiting: 80,
    });
    act(() => {
      result.current.store.getState().fail(7, id);
    });
    // everything back: the chips, the count, the time and Next up
    expect(result.current.row.live).toBe(ITEM);
  });

  it('reads the overview again only once the marks used up the codes sent', () => {
    const result = setup();
    act(() => {
      result.current.store.getState().begin(7, marks(7, 10));
    });
    result.current.row.onMarked();
    expect(router.refresh).not.toHaveBeenCalled();
    act(() => {
      result.current.store.getState().begin(7, marks(11, 13));
    });
    act(() => {
      result.current.row.onMarked();
    });
    // one code sent is left: the store carries the run on, no refresh yet
    expect(router.refresh).not.toHaveBeenCalled();
    act(() => {
      result.current.store.getState().begin(7, marks(14, 14));
    });
    act(() => {
      result.current.row.onMarked();
    });
    expect(router.refresh).toHaveBeenCalledOnce();
  });
});
