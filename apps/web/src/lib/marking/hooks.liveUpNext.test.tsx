// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import type { UpNextItem } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useLiveUpNext } from './hooks';
import MarkingProvider, { useMarkingStoreApi } from './MarkingProvider';
import type { SeriesSeed } from './types';

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <MarkingProvider>{children}</MarkingProvider>
);

const seedOf = (seriesId: number, fetchedAt = 1): SeriesSeed => ({
  fetchedAt,
  seasons: [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }],
  seriesId,
  watched: [{ episodeNumber: 1, seasonNumber: 1, watchedAt: 1000 }],
});

const ITEMS: ReadonlyArray<UpNextItem> = [
  {
    airDate: '2026-11-01',
    code: 'S01E02',
    episode: 2,
    episodeTitle: 'Two',
    isLatest: false,
    lastWatchedAt: 1000,
    lastWatchedCode: 'S01E01',
    nextSeasonTba: false,
    nextToAir: null,
    posterImage: '/p.jpg',
    runtime: 40,
    season: 1,
    seasonFinale: false,
    seasonRuntimes: [40, 40, 40],
    seasonTotal: 3,
    seasonWatched: 1,
    seriesId: 7,
    slug: 'show',
    timeLeftMinutes: 80,
    title: 'Show',
    toWatch: 2,
  },
];

describe('useLiveUpNext: only its own shows re-render it', () => {
  it('keeps its render and its list when another show is seeded or marked', () => {
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return {
          live: useLiveUpNext(ITEMS, Date.UTC(2026, 10, 12)),
          store: useMarkingStoreApi(),
        };
      },
      { wrapper },
    );
    act(() => {
      result.current.store.getState().seed(seedOf(7), 'seven');
    });
    const before = { list: result.current.live, renders };

    act(() => {
      const { store } = result.current;
      store.getState().seed(seedOf(99), 'other');
      store.getState().begin(99, {
        kind: 'mark',
        records: { S01E02: { runtime: 0, watchedAt: 2000 } },
      });
    });

    expect(renders).toBe(before.renders);
    expect(result.current.live).toBe(before.list);
  });

  it('moves on when its own show is marked', () => {
    const { result } = renderHook(
      () => ({
        live: useLiveUpNext(ITEMS, Date.UTC(2026, 10, 12)),
        store: useMarkingStoreApi(),
      }),
      { wrapper },
    );
    act(() => {
      result.current.store.getState().seed(seedOf(7), 'seven');
    });
    act(() => {
      result.current.store.getState().begin(7, {
        kind: 'mark',
        records: { S01E02: { runtime: 0, watchedAt: 2000 } },
      });
    });
    expect(result.current.live[0]?.code).toBe('S01E03');
  });
});
