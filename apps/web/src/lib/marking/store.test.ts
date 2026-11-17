import type { LibraryIds } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { withMembership } from './state';
import { createMarkingStore } from './store';
import type { SeriesSeed } from './types';

const SERIES = 136315;
const seasons = [{ airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 2 }];

const viewerSeed = (
  fetchedAt: number,
  watched: SeriesSeed['watched'] = [],
): SeriesSeed => ({
  fetchedAt,
  seasons,
  seriesId: SERIES,
  status: {
    isFavorited: false,
    isWatchlisted: false,
    prefs: { firstTrackingAnsweredAt: 1, neverAskBefore: false, skipped: [] },
  },
  watched,
});

const seed = (store: ReturnType<typeof createMarkingStore>, s: SeriesSeed) =>
  store.getState().seed(s, JSON.stringify(s));

const watchedCodes = (store: ReturnType<typeof createMarkingStore>) =>
  Object.keys(store.getState().series[SERIES]?.view.watched ?? {});

describe('seeds never undo a settled mark (Back after a mark)', () => {
  it('ignores the old page seed that comes back after a settled mark', () => {
    const store = createMarkingStore();
    const pageSeed = viewerSeed(1_000);
    seed(store, pageSeed);
    const id = store.getState().begin(SERIES, {
      kind: 'mark',
      records: { S02E05: { runtime: 30, watchedAt: 2_000 } },
    });
    store.getState().settle(SERIES, id, [], 2_000);

    // Back: Next re-runs the preserved page's effects with its old payload.
    seed(store, pageSeed);
    store.getState().seed(pageSeed, 'another key for the same old data');

    expect(watchedCodes(store)).toEqual(['S02E05']);
  });

  it('applies a seed fetched after the write', () => {
    const store = createMarkingStore();
    seed(store, viewerSeed(1_000));
    const id = store.getState().begin(SERIES, {
      kind: 'mark',
      records: { S02E05: { runtime: 30, watchedAt: 2_000 } },
    });
    store.getState().settle(SERIES, id, [], 2_000);

    seed(
      store,
      viewerSeed(3_000, [
        { episodeNumber: 5, seasonNumber: 2, watchedAt: 2_000 },
        { episodeNumber: 6, seasonNumber: 2, watchedAt: 2_500 },
      ]),
    );

    expect(watchedCodes(store).sort()).toEqual(['S02E05', 'S02E06']);
  });

  it('a seasons-only seed never replaces a seeded show', () => {
    const store = createMarkingStore();
    seed(
      store,
      viewerSeed(1_000, [{ episodeNumber: 1, seasonNumber: 2, watchedAt: 9 }]),
    );
    seed(store, { seasons, seriesId: SERIES });
    expect(watchedCodes(store)).toEqual(['S02E01']);
    expect(store.getState().series[SERIES]?.view.status).not.toBeNull();
  });

  it('correct() applies what a failed write did save', () => {
    const store = createMarkingStore();
    seed(store, viewerSeed(1_000));
    store
      .getState()
      .correct(
        SERIES,
        [{ kind: 'mark', records: { S02E01: { runtime: 30, watchedAt: 5 } } }],
        4_000,
      );
    expect(watchedCodes(store)).toEqual(['S02E01']);
    seed(store, viewerSeed(3_000));
    expect(watchedCodes(store)).toEqual(['S02E01']);
  });
});

describe('a seed made during a render', () => {
  it('is in the store at once, and subscribers hear of it after the render', async () => {
    const store = createMarkingStore();
    const heard: string[] = [];
    store.subscribe(() => heard.push('a'));
    store.subscribe(() => heard.push('b'));

    store.seedInRender(viewerSeed(1_000), 'k');
    expect(store.getState().series[SERIES]).toBeDefined();
    expect(heard).toEqual([]);

    await Promise.resolve();
    expect(heard).toEqual(['a', 'b']);
  });

  it('notifies each subscriber once for several seeds in one render', async () => {
    const store = createMarkingStore();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.seedInRender(viewerSeed(1_000), 'k1');
    store.seedInRender({ ...viewerSeed(1_000), seriesId: 2 }, 'k2');
    await Promise.resolve();
    expect(calls).toBe(1);
  });

  it('leaves every other change as it was: subscribers hear of it at once', () => {
    const store = createMarkingStore();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    seed(store, viewerSeed(1_000));
    expect(calls).toBe(1);
  });
});

describe('the hydration state: every show as its first seed drew it', () => {
  it('keeps the seeded show for a part that hydrates after a mark', () => {
    const store = createMarkingStore();
    store.seedInRender(viewerSeed(1_000), 'k');
    const seeded = store.getState().series[SERIES]?.view;
    store.getState().begin(SERIES, {
      kind: 'mark',
      records: { S02E05: { runtime: 30, watchedAt: 2_000 } },
    });
    expect(watchedCodes(store)).toEqual(['S02E05']);
    // what the server rendered with, so the late part hydrates without a
    // mismatch; it draws the mark right after, from the live state
    expect(store.getHydrationState().series[SERIES]?.view).toBe(seeded);
    // stable while nothing changes (useSyncExternalStore's server snapshot)
    expect(store.getHydrationState()).toBe(store.getHydrationState());
  });

  it('is the state itself before any seed in a render', () => {
    const store = createMarkingStore();
    seed(store, viewerSeed(1_000));
    expect(store.getHydrationState()).toBe(store.getState());
  });
});

describe('episodesSaved: the episodes this tab saved as watched, net', () => {
  it('counts what the server took (marks up, unmarks down), never pending, re-seeds or failures', () => {
    const store = createMarkingStore();
    seed(
      store,
      viewerSeed(1_000, [{ episodeNumber: 1, seasonNumber: 2, watchedAt: 1 }]),
    );
    const mark = store.getState().begin(SERIES, {
      kind: 'mark',
      records: {
        // already watched: no change
        S02E01: { runtime: 30, watchedAt: 2_000 },
        S02E02: { runtime: 30, watchedAt: 2_000 },
        S02E03: { runtime: 30, watchedAt: 2_000 },
      },
    });
    expect(store.getState().episodesSaved).toBe(0);
    store.getState().settle(SERIES, mark, [], 2_000);
    expect(store.getState().episodesSaved).toBe(2);

    const failed = store.getState().begin(SERIES, {
      kind: 'mark',
      records: { S02E04: { runtime: 30, watchedAt: 3_000 } },
    });
    store.getState().fail(SERIES, failed);
    const unmark = store
      .getState()
      .begin(SERIES, { codes: ['S02E01'], kind: 'unmark' });
    store.getState().settle(SERIES, unmark, [], 3_000);
    expect(store.getState().episodesSaved).toBe(1);

    // a newer seed is the server's view, not a change made here
    seed(store, viewerSeed(9_000, []));
    expect(store.getState().episodesSaved).toBe(1);
  });
});

describe('library changes made while the ids load', () => {
  const EMPTY: LibraryIds = {
    favorites: [],
    inProgress: [],
    watched: [],
    watchlist: [],
  };
  const addToWatchlist = (ids: LibraryIds) =>
    withMembership(ids, 'watchlist', [7], true);

  it('are applied to ids that arrive without them (read before the write)', () => {
    const store = createMarkingStore();
    store.getState().setLibrary({ status: 'loading' });
    store.getState().updateLibraryIds(addToWatchlist);
    store.getState().setLibrary({ ids: EMPTY, status: 'ready' });

    expect(store.getState().library).toEqual({
      ids: { ...EMPTY, watchlist: [7] },
      status: 'ready',
    });
  });

  it('change nothing when the ids already have them (read after the write)', () => {
    const store = createMarkingStore();
    const ids = { ...EMPTY, watchlist: [7] };
    store.getState().setLibrary({ status: 'loading' });
    store.getState().updateLibraryIds(addToWatchlist);
    store.getState().setLibrary({ ids, status: 'ready' });

    expect(store.getState().library).toEqual({ ids, status: 'ready' });
  });

  it('keep their order: a refused write rolled back during the load stays out', () => {
    const store = createMarkingStore();
    store.getState().setLibrary({ status: 'loading' });
    store.getState().updateLibraryIds(addToWatchlist);
    store
      .getState()
      .updateLibraryIds((ids) => withMembership(ids, 'watchlist', [7], false));
    store.getState().setLibrary({ ids: EMPTY, status: 'ready' });

    expect(store.getState().library).toEqual({ ids: EMPTY, status: 'ready' });
  });

  it('are dropped when the load fails, and never reach a later load', () => {
    const store = createMarkingStore();
    store.getState().setLibrary({ status: 'loading' });
    store.getState().updateLibraryIds(addToWatchlist);
    store.getState().setLibrary({ status: 'error' });
    store.getState().setLibrary({ status: 'loading' });
    store.getState().setLibrary({ ids: EMPTY, status: 'ready' });

    expect(store.getState().library).toEqual({ ids: EMPTY, status: 'ready' });
  });
});
