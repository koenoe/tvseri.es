'use client';

import {
  type Context,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import { persistLibraryHint } from './libraryHint';
import {
  createMarkingStore,
  type MarkingStore,
  type MarkingStoreApi,
} from './store';

type StoreContext = Context<MarkingStoreApi | null>;

/**
 * One context however many times this module is evaluated, for dev reloads
 * only: a hot reload in `next dev` can evaluate it again while the root
 * layout still renders the earlier copy's provider, and every marking hook
 * from the new copy would then throw during the server render. Production
 * builds evaluate it once. The context holds no state (the store is per
 * provider), so sharing its identity is safe on the server too.
 */
const CONTEXT_KEY = Symbol.for('tvseri.es/marking-store-context');
const realm = globalThis as typeof globalThis & {
  [CONTEXT_KEY]?: StoreContext;
};
realm[CONTEXT_KEY] ??= createContext<MarkingStoreApi | null>(null);
const MarkingStoreContext: StoreContext = realm[CONTEXT_KEY];

/** The tab's store, for UI that mounts outside the provider (see `MarkingStoreBridge`) */
let tabStore: MarkingStoreApi | null = null;

/**
 * Holds the marking store (root layout). One store per tab in the browser and
 * per request on the server.
 */
export default function MarkingProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [store] = useState(createMarkingStore);
  useEffect(() => persistLibraryHint(store), [store]);
  useEffect(() => {
    tabStore = store;
    return () => {
      if (tabStore === store) {
        tabStore = null;
      }
    };
  }, [store]);
  return (
    <MarkingStoreContext.Provider value={store}>
      {children}
    </MarkingStoreContext.Provider>
  );
}

/**
 * Gives UI that sits next to the provider rather than under it (the search
 * overlay, mounted by the launcher in the root layout) the same store, so a
 * Watched label there reads the library the page already loaded. Client
 * only: render it after hydration, never in the server's tree.
 */
export function MarkingStoreBridge({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <MarkingStoreContext.Provider value={tabStore}>
      {children}
    </MarkingStoreContext.Provider>
  );
}

export function useMarkingStoreApi(): MarkingStoreApi {
  const store = useContext(MarkingStoreContext);
  if (!store) {
    throw new Error('Marking hooks need <MarkingProvider> (root layout)');
  }
  return store;
}

/**
 * Selects from the marking store; return primitives or stored objects.
 *
 * The server (and hydration) snapshot is the store's CURRENT state, not
 * zustand's initial one: `SeedSeries` seeds during render, so controls
 * rendered after it already draw the viewer's marks in the server HTML, and
 * the browser, seeding the same way before hydrating them, agrees.
 */
export function useMarkingStore<T>(selector: (state: MarkingStore) => T): T {
  const store = useMarkingStoreApi();
  const read = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(store.subscribe, read, read);
}
