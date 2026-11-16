import type { LibraryIds } from '@tvseri.es/schemas';
import { createStore } from 'zustand/vanilla';

import { applyOp, applyPending, type PendingOp, seedToBase } from './state';
import type { MarkingOp, SeriesBase, SeriesSeed } from './types';

export type SeriesEntry = Readonly<{
  /** Server truth (the last seed plus every settled change). */
  base: SeriesBase;
  /** Optimistic changes still waiting for the server, in order. */
  pending: ReadonlyArray<PendingOp>;
  /** The base with the pending changes on top: what every control draws. */
  view: SeriesBase;
  /** Identifies the seed data, so the same seed twice is a no-op. */
  seedKey: string;
  /**
   * Server time (epoch ms) of the newest truth in `base`: the last applied
   * seed's `fetchedAt` or the last settled write's `at`. A seed fetched
   * before it (an old RSC payload on Back) is ignored, so it can never undo
   * a mark.
   */
  version: number;
}>;

export type LibraryState = Readonly<
  | { status: 'idle' | 'loading' | 'signed-out' | 'error' }
  | { status: 'ready'; ids: LibraryIds }
>;

export type MarkingState = Readonly<{
  series: Readonly<Record<number, SeriesEntry>>;
  library: LibraryState;
  /**
   * Hide from in progress, as this tab changed it: `true` hidden, `false`
   * brought back (over what a page drew), absent when untouched. The pref
   * lives on the server; this only makes every list update at once.
   */
  hidden: Readonly<Record<number, boolean>>;
  /**
   * Regular episodes this tab's writes saved as watched, net (a mark adds,
   * an unmark takes away), counted when the server took them: the viewer's
   * own episode count adds it on top of the number it was rendered with.
   */
  episodesSaved: number;
}>;

export type MarkingActions = Readonly<{
  /**
   * Seeds (or re-seeds) a show; pending changes stay on top. A seed older
   * than the entry (`fetchedAt` not after its `version`) is a no-op, and a
   * seed without `fetchedAt` only seeds a show the store doesn't have.
   */
  seed: (seed: SeriesSeed, seedKey: string) => void;
  /** Starts an optimistic change; returns its id for `settle`/`fail`. */
  begin: (seriesId: number, op: MarkingOp) => number;
  /**
   * The server accepted change `id`: it moves into the base, followed by
   * `corrections` (the server's own records, e.g. real dates and runtimes).
   */
  settle: (
    seriesId: number,
    id: number,
    corrections?: ReadonlyArray<MarkingOp>,
    /** Server time of the write (the action's `at`). */
    at?: number,
  ) => void;
  /**
   * Server truth learned outside a settle (what a failed multi-request write
   * did save): applied to the base, pending changes stay on top.
   */
  correct: (
    seriesId: number,
    ops: ReadonlyArray<MarkingOp>,
    at?: number,
  ) => void;
  /** The server refused change `id`: drop it (the view rolls back). */
  fail: (seriesId: number, id: number) => void;
  /**
   * The library as loaded (or why there is none). Ids that arrive while
   * `loading` get the changes made meanwhile on top (see `updateLibraryIds`).
   */
  setLibrary: (library: LibraryState) => void;
  /**
   * Changes the loaded library ids (`withMembership`, `libraryAfter`); a
   * no-op when `change` returns the same ids. While the ids load, the change
   * waits and is applied to them when they arrive: a write made during the
   * load may or may not be in the answer, and every change is a set
   * membership, so applying it again is harmless. Before a load and after a
   * failed one it is dropped.
   */
  updateLibraryIds: (change: (ids: LibraryIds) => LibraryIds) => void;
  /** Hidden (`true`), brought back (`false`) or untouched again (`undefined`) */
  setHidden: (seriesId: number, value: boolean | undefined) => void;
  /** Episodes saved outside a settle (the Remote's N on an unseeded show) */
  countSaved: (episodes: number) => void;
}>;

/** Regular episodes a base has watched (specials never count) */
const regularWatched = (base: SeriesBase) =>
  Object.keys(base.watched).filter((code) => !code.startsWith('S00')).length;

export type MarkingStore = MarkingState & MarkingActions;

const entry = (
  base: SeriesBase,
  pending: ReadonlyArray<PendingOp>,
  seedKey: string,
  version: number,
): SeriesEntry => ({
  base,
  pending,
  seedKey,
  version,
  view: applyPending(base, pending),
});

let nextOpId = 0;

type Listener = (state: MarkingStore, previous: MarkingStore) => void;

/**
 * `seedInRender`: a seed made while a component renders (`SeedSeries`) is in
 * the store at once, for that component and every one rendered after it,
 * but the store's subscribers hear of it in a microtask, after the render.
 * A control already mounted elsewhere (the history sheet, the hero's
 * progress) would otherwise be updated during another component's render,
 * which React refuses ("Cannot update a component while rendering a
 * different component").
 */
function withRenderSafeSeed(store: ReturnType<typeof createStoreOf>) {
  let inRender = 0;
  const deferred = new Map<Listener, MarkingStore>();
  const flush = () => {
    const calls = [...deferred];
    deferred.clear();
    for (const [listener, previous] of calls) {
      listener(store.getState(), previous);
    }
  };
  const subscribe = store.subscribe;
  store.subscribe = (listener: Listener) =>
    subscribe((state, previous) => {
      if (inRender === 0) {
        listener(state, previous);
        return;
      }
      if (deferred.size === 0) {
        queueMicrotask(flush);
      }
      if (!deferred.has(listener)) {
        deferred.set(listener, previous);
      }
    });
  const seedInRender: MarkingActions['seed'] = (seed, seedKey) => {
    inRender += 1;
    try {
      store.getState().seed(seed, seedKey);
    } finally {
      inRender -= 1;
    }
  };
  return Object.assign(store, { seedInRender });
}

/**
 * The marking store: one per browser tab (`MarkingProvider`), created per
 * request on the server, so one viewer's seed never reaches another.
 */
export function createMarkingStore() {
  return withRenderSafeSeed(createStoreOf());
}

type LibraryChange = (ids: LibraryIds) => LibraryIds;

function createStoreOf() {
  /** Library changes made while the ids load (`updateLibraryIds`) */
  let duringLoad: LibraryChange[] = [];
  return createStore<MarkingStore>()((set, get) => ({
    begin: (seriesId, op) => {
      nextOpId += 1;
      const id = nextOpId;
      const current = get().series[seriesId];
      if (current) {
        set({
          series: {
            ...get().series,
            [seriesId]: entry(
              current.base,
              [...current.pending, { id, op }],
              current.seedKey,
              current.version,
            ),
          },
        });
      }
      return id;
    },
    correct: (seriesId, ops, at = 0) => {
      const current = get().series[seriesId];
      if (!current || ops.length === 0) {
        return;
      }
      const base = ops.reduce(applyOp, current.base);
      set({
        episodesSaved:
          get().episodesSaved +
          regularWatched(base) -
          regularWatched(current.base),
        series: {
          ...get().series,
          [seriesId]: entry(
            base,
            current.pending,
            current.seedKey,
            Math.max(current.version, at),
          ),
        },
      });
    },
    countSaved: (episodes) =>
      set({ episodesSaved: get().episodesSaved + episodes }),
    episodesSaved: 0,
    fail: (seriesId, id) => {
      const current = get().series[seriesId];
      if (!current) {
        return;
      }
      set({
        series: {
          ...get().series,
          [seriesId]: entry(
            current.base,
            current.pending.filter((item) => item.id !== id),
            current.seedKey,
            current.version,
          ),
        },
      });
    },
    hidden: {},
    library: { status: 'idle' },
    seed: (seed, seedKey) => {
      const current = get().series[seed.seriesId];
      const fetchedAt = seed.fetchedAt ?? 0;
      if (
        current &&
        (current.seedKey === seedKey || fetchedAt <= current.version)
      ) {
        return;
      }
      set({
        series: {
          ...get().series,
          [seed.seriesId]: entry(
            seedToBase(seed),
            current?.pending ?? [],
            seedKey,
            fetchedAt,
          ),
        },
      });
    },
    series: {},
    setHidden: (seriesId, value) => {
      const { [seriesId]: _, ...rest } = get().hidden;
      set({
        hidden: value === undefined ? rest : { ...rest, [seriesId]: value },
      });
    },
    setLibrary: (library) => {
      if (library.status === 'loading') {
        set({ library });
        return;
      }
      const changes = duringLoad;
      duringLoad = [];
      set({
        library:
          library.status === 'ready' && changes.length > 0
            ? {
                ids: changes.reduce((ids, change) => change(ids), library.ids),
                status: 'ready',
              }
            : library,
      });
    },
    settle: (seriesId, id, corrections = [], at = 0) => {
      const current = get().series[seriesId];
      if (!current) {
        return;
      }
      const settled = current.pending.find((item) => item.id === id);
      const base = settled
        ? [settled.op, ...corrections].reduce(applyOp, current.base)
        : corrections.reduce(applyOp, current.base);
      set({
        episodesSaved:
          get().episodesSaved +
          regularWatched(base) -
          regularWatched(current.base),
        series: {
          ...get().series,
          [seriesId]: entry(
            base,
            current.pending.filter((item) => item.id !== id),
            current.seedKey,
            Math.max(current.version, at),
          ),
        },
      });
    },
    updateLibraryIds: (change) => {
      const library = get().library;
      if (library.status === 'loading') {
        duringLoad.push(change);
        return;
      }
      if (library.status !== 'ready') {
        return;
      }
      const ids = change(library.ids);
      if (ids !== library.ids) {
        set({ library: { ids, status: 'ready' } });
      }
    },
  }));
}

export type MarkingStoreApi = ReturnType<typeof createMarkingStore>;
