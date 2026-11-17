'use client';

import type { EpisodeRef, LibraryIds, UpNextItem } from '@tvseri.es/schemas';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useShallow } from 'zustand/shallow';

import { ACCOUNT_GONE } from '@/auth/accountGone';
import { readDisplayUsername } from '@/auth/displayUsername';
import {
  forgetViewer,
  readSignedIn,
  subscribeToSignedIn,
} from '@/components/menu/displayCookie';
import { ensureSeries } from './ensureSeries';
import { isNewToViewer } from './librarySets';
import { useMarkingStore, useMarkingStoreApi } from './MarkingProvider';
import {
  codeOf,
  episodeState,
  nextEpisode,
  type SeriesProgress,
  seriesProgress,
} from './progress';
import type { LibraryState, MarkingStore, MarkingStoreApi } from './store';
import type {
  EpisodeState,
  ListStatus,
  SeriesBase,
  WatchRecord,
} from './types';
import { liveUpNext } from './upNext';

/** The show as every control draws it (base + pending), once seeded. */
export function useSeriesView(seriesId: number): SeriesBase | undefined {
  return useMarkingStore((state) => state.series[seriesId]?.view);
}

/**
 * One answer about the show's marks (a primitive: "complete?", "unavailable?"),
 * re-rendering only when that answer changes, not on every mark the way the
 * whole view (`useSeriesView`) does. `answer` gets `undefined` until the show
 * is seeded; keep it stable (module level, or `useCallback`).
 *
 * @example
 * const complete = useSeriesAnswer(id, (view) => view ? seriesProgress(view).isComplete : false);
 */
export function useSeriesAnswer<
  T extends boolean | number | string | null | undefined,
>(seriesId: number, answer: (view: SeriesBase | undefined) => T): T {
  const select = useCallback(
    (state: MarkingStore) => answer(state.series[seriesId]?.view),
    [answer, seriesId],
  );
  return useMarkingStore(select);
}

/** `undefined` until the show is seeded. */
export function useEpisodeState(
  seriesId: number,
  ref: EpisodeRef,
): EpisodeState | undefined {
  return useMarkingStore((state) => {
    const view = state.series[seriesId]?.view;
    return view ? episodeState(view, ref) : undefined;
  });
}

/** The watched record (date, no-date flag) of one episode. */
export function useEpisodeRecord(
  seriesId: number,
  ref: EpisodeRef,
): WatchRecord | undefined {
  return useMarkingStore(
    (state) => state.series[seriesId]?.view.watched[codeOf(ref)],
  );
}

export function useSeriesProgress(
  seriesId: number,
): SeriesProgress | undefined {
  const view = useSeriesView(seriesId);
  return useMemo(() => (view ? seriesProgress(view) : undefined), [view]);
}

/** Next up (`null`: everything aired is watched or skipped). */
export function useNextEpisode(
  seriesId: number,
): EpisodeRef | null | undefined {
  const view = useSeriesView(seriesId);
  return useMemo(() => (view ? nextEpisode(view) : undefined), [view]);
}

/**
 * Up next items (`GET /me/overview`) as the store has their shows now
 * (`liveUpNext`): a mark made anywhere in the tab moves an item on at once,
 * an Undo moves it back, and a show with nothing aired left drops out. The
 * server items until a show is seeded (the store is empty during SSR and
 * hydration, so the HTML matches).
 */
export function useLiveUpNext(
  items: ReadonlyArray<UpNextItem>,
): ReadonlyArray<UpNextItem> {
  // the views of these items' shows only (shallow): a mark on another show
  // leaves the list and its render alone
  const views = useMarkingStore(
    useShallow((state) =>
      items.map((item) => state.series[item.seriesId]?.view),
    ),
  );
  const hidden = useHiddenShows();
  return useMemo(
    () =>
      items.flatMap((item, index) => {
        // hidden from in progress here: it leaves (the next show takes its place)
        if (hidden[item.seriesId] === true) {
          return [];
        }
        const live = liveUpNext(item, views[index]);
        return live ? [live] : [];
      }),
    [hidden, items, views],
  );
}

/** Shows this tab hid (`true`) or brought back (`false`) from in progress */
export function useHiddenShows(): Readonly<Record<number, boolean>> {
  return useMarkingStore((state) => state.hidden);
}

/** Favourite / watchlist state: `null` signed out or unknown. */
export function useListStatus(seriesId: number): ListStatus | null | undefined {
  return useMarkingStore((state) => {
    const entry = state.series[seriesId];
    return entry ? entry.view.status : undefined;
  });
}

/**
 * Signed in? From the display cookie: `undefined` on the server and during
 * hydration (so cached HTML is the same for everyone), then a boolean.
 */
export function useIsSignedIn(): boolean | undefined {
  return useSyncExternalStore<boolean | undefined>(
    subscribeToSignedIn,
    readSignedIn,
    () => undefined,
  );
}

/** The library route's 401 for an account that no longer exists (`AccountGone`). */
const isAccountGone = async (response: Response): Promise<boolean> => {
  try {
    const body: unknown = await response.json();
    return (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      body.error === ACCOUNT_GONE
    );
  } catch {
    return false;
  }
};

const loadLibrary = async (store: MarkingStoreApi) => {
  store.getState().setLibrary({ status: 'loading' });
  try {
    const response = await fetch('/api/me/library-ids', {
      credentials: 'same-origin',
    });
    if (response.status === 401) {
      if (await isAccountGone(response)) {
        forgetViewer();
      }
      store.getState().setLibrary({ status: 'signed-out' });
      return;
    }
    if (!response.ok) {
      throw new Error(`library-ids ${response.status}`);
    }
    store.getState().setLibrary({
      ids: (await response.json()) as LibraryIds,
      status: 'ready',
    });
  } catch {
    store.getState().setLibrary({ status: 'error' });
  }
};

const IDLE_LIBRARY: LibraryState = { status: 'idle' };

/**
 * Loads the viewer's library once per tab, after hydration (or marks it
 * signed out). "Signed in?" is read inside the effect, not subscribed to:
 * its server snapshot is `undefined`, so a subscription would re-render every
 * tile of a page once after hydration.
 */
function useLoadLibrary(store: MarkingStoreApi) {
  useEffect(() => {
    if (store.getState().library.status !== 'idle') {
      return;
    }
    if (!readSignedIn()) {
      store.getState().setLibrary({ status: 'signed-out' });
      return;
    }
    void loadLibrary(store);
  }, [store]);
}

/**
 * The viewer's library ids: Watched labels, In progress, `+` and the
 * relation pills on cached pages. One call per tab after hydration, shared by
 * every caller; marks and list toggles keep it current. A tile that needs one
 * answer about one show reads `useLibrarySelect` instead, so a mark
 * re-renders only the tiles whose answer changed.
 */
export function useLibraryIds(): LibraryState {
  const store = useMarkingStoreApi();
  // The server (and hydration) always sees `idle`: the ids load in the
  // browser, and a boundary that hydrates late must not draw them yet, or it
  // would not match the cached HTML (hydration mismatch).
  const library = useSyncExternalStore(
    store.subscribe,
    () => store.getState().library,
    () => IDLE_LIBRARY,
  );
  useLoadLibrary(store);
  return library;
}

/**
 * Loads the viewer's library ids without subscribing to them: for a view
 * whose children read them, so a mark doesn't re-render the whole view.
 */
export function useLoadLibraryIds(): void {
  useLoadLibrary(useMarkingStoreApi());
}

/**
 * One answer from the viewer's library (a primitive: "is 7 watched?", a
 * relation), re-rendering only when that answer changes. `fallback`
 * until the library is known, signed out, and on the server and during
 * hydration (as `useLibraryIds`).
 *
 * @example
 * const watched = useLibrarySelect((ids) => librarySets(ids).watched.has(id), false);
 */
export function useLibrarySelect<T>(
  select: (ids: LibraryIds) => T,
  fallback: T,
): T {
  const store = useMarkingStoreApi();
  const answer = useSyncExternalStore(
    store.subscribe,
    () => {
      const library = store.getState().library;
      return library.status === 'ready' ? select(library.ids) : fallback;
    },
    () => fallback,
  );
  useLoadLibrary(store);
  return answer;
}

/**
 * An answer `take`n from the viewer's library ids once, when they first
 * arrive, and the library's status: a later mark or list press changes
 * neither, so nothing moves under the viewer's finger and a mark re-renders
 * nothing. `taken` is null until then (on the server and during hydration
 * too, as `useLibraryIds`), and stays null signed out or when the load
 * failed (`status` says which).
 *
 * @example
 * const { status, taken } = useLibraryOnce(keepUnseen);
 */
export function useLibraryOnce<T>(
  take: (ids: LibraryIds) => T,
): Readonly<{ status: LibraryState['status']; taken: T | null }> {
  const store = useMarkingStoreApi();
  const status = useSyncExternalStore(
    store.subscribe,
    () => store.getState().library.status,
    () => IDLE_LIBRARY.status,
  );
  useLoadLibrary(store);
  const [taken, setTaken] = useState<Readonly<{ value: T }> | null>(null);
  const library = store.getState().library;
  if (taken === null && status === 'ready' && library.status === 'ready') {
    setTaken({ value: take(library.ids) });
  }
  return { status, taken: taken ? taken.value : null };
}

/**
 * A profile's episode count as this tab has it: the server's `count`, plus
 * the episodes this tab saved since that count arrived when the profile is
 * the viewer's own (`episodesSaved`), so the sidebar moves with a mark on
 * the same screen. A new `count` (a fresh render) starts over.
 */
export function useOwnEpisodeCount(username: string, count: number): number {
  const saved = useMarkingStore((state) => state.episodesSaved);
  const [since, setSince] = useState(() => ({ count, saved }));
  if (since.count !== count) {
    setSince({ count, saved });
  }
  const added = saved - since.saved;
  if (added === 0 || typeof document === 'undefined') {
    return count;
  }
  return readDisplayUsername(document.cookie) === username
    ? Math.max(0, count + added)
    : count;
}

/**
 * `items` without the series the viewer already has (`isNewToViewer`):
 * what a "start something new" pick may offer. Everything until the library
 * is known (the server, hydration, signed out), so cached HTML matches.
 */
export function useNewToViewer<T extends Readonly<{ id: number }>>(
  items: ReadonlyArray<T>,
): ReadonlyArray<T> {
  // a primitive answer ("1,4"), so only a change of what stays re-renders
  const kept = useLibrarySelect<string | null>(
    (ids) =>
      items
        .filter((item) => isNewToViewer(ids, item.id))
        .map((item) => item.id)
        .join(','),
    null,
  );
  return useMemo(() => {
    if (kept === null) {
      return items;
    }
    const ids = new Set(kept.split(',').map(Number));
    return items.filter((item) => ids.has(item.id));
  }, [items, kept]);
}

/**
 * For a page the server rendered signed out (the 401) while this browser
 * still shows a viewer: loads the library again, whose `AccountGone` answer
 * makes the browser forget an account deleted elsewhere (`forgetViewer`).
 * Signed out, nothing runs.
 */
export function useRecheckViewer(): void {
  const store = useMarkingStoreApi();
  useEffect(() => {
    if (readSignedIn()) {
      void loadLibrary(store);
    }
  }, [store]);
}

/**
 * Seeds a show the page didn't (the Remote on a tile): fetches its marking
 * state once when `enabled` and signed in (`ensureSeries`, shared with
 * Home's warm-up on hover). Returns the view when ready.
 */
export function useEnsureSeries(
  seriesId: number,
  enabled: boolean,
): SeriesBase | undefined {
  const store = useMarkingStoreApi();
  const view = useSeriesView(seriesId);
  const signedIn = useIsSignedIn();
  useEffect(() => {
    if (enabled && signedIn) {
      void ensureSeries(store, seriesId);
    }
  }, [enabled, seriesId, signedIn, store]);
  return view;
}
