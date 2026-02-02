'use client';

import { createContext, type ReactNode, useContext, useRef } from 'react';

import { useStore } from 'zustand';

import getHistoryKey from '@/utils/getHistoryKey';
import { wasBackNavigation } from '@/utils/navigationState';

import { createPageStore, type PageStore } from './store';

export type PageStoreApi = ReturnType<typeof createPageStore>;

const PageStoreContext = createContext<PageStoreApi | null>(null);

export type PageStoreProviderProps = {
  backgroundColor: string;
  backgroundImage: string;
  children: ReactNode;
};

/**
 * Provides page-level background state to children.
 *
 * Following state-decouple-implementation pattern: this provider is the only
 * place that knows how state is managed. UI components consume the context
 * interface—they don't know if state comes from useState, Zustand, or cache.
 *
 * Uses in-memory caching (js-cache-function-results pattern) keyed by historyKey:
 * - Refresh: Cache clears → SSR values are used (correct!)
 * - Back navigation: Same historyKey + wasBackNavigation() → cache hit → instant restore
 * - Forward navigation: New historyKey or !wasBackNavigation() → SSR values
 *
 * Activity reveal detection:
 * With cacheComponents, components hide/reveal instead of unmount/remount.
 * We track historyKeyRef to detect when the component reveals with a different
 * history entry and reset the store accordingly.
 */
export const PageStoreProvider = ({
  backgroundColor,
  backgroundImage,
  children,
}: PageStoreProviderProps) => {
  const storeRef = useRef<PageStoreApi>(null);
  const historyKeyRef = useRef<string | null>(null);

  const currentHistoryKey = getHistoryKey();

  // Detect Activity reveal with different historyKey
  // When historyKey changes but component didn't remount (Activity reveal),
  // we need to reset the store to handle the new navigation context
  if (
    historyKeyRef.current !== null &&
    historyKeyRef.current !== currentHistoryKey
  ) {
    storeRef.current = null;
  }
  historyKeyRef.current = currentHistoryKey;

  if (!storeRef.current) {
    const shouldRestore = wasBackNavigation();
    storeRef.current = createPageStore(
      { backgroundColor, backgroundImage, enableTransitions: false },
      `page:${currentHistoryKey}`,
      shouldRestore,
    );
  }

  return (
    <PageStoreContext.Provider value={storeRef.current}>
      {children}
    </PageStoreContext.Provider>
  );
};

export const usePageStore = <T,>(selector: (store: PageStore) => T): T => {
  const pageStoreContext = useContext(PageStoreContext);

  if (!pageStoreContext) {
    throw new Error(`usePageStore must be used within <PageStoreProvider />`);
  }

  return useStore(pageStoreContext, selector);
};
