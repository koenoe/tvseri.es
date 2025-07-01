'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from 'react';

import { useStore } from 'zustand';

import getHistoryKey from '@/utils/getHistoryKey';

import { createPageStore, type PageState, type PageStore } from './store';

export type PageStoreApi = ReturnType<typeof createPageStore>;

export const PageStoreContext = createContext<PageStoreApi | null>(null);

export type PageStoreProviderProps = PageState & {
  children: ReactNode;
  persistent?: boolean;
};

export const PageStoreProvider = ({
  backgroundColor,
  backgroundImage,
  children,
  persistent = true,
}: PageStoreProviderProps) => {
  const storeRef = useRef<PageStoreApi>(null);

  if (!storeRef.current) {
    storeRef.current = createPageStore(
      { backgroundColor, backgroundImage },
      `page:${getHistoryKey()}`,
      persistent,
    );
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: wablief
  useEffect(() => {
    const store = storeRef.current;
    if (!store) {
      return;
    }

    const name = store.persist?.getOptions()?.name ?? '';
    const version = store.persist?.getOptions()?.version ?? 0;

    return () => {
      const currentState = store.getState();
      const storeOnUnmount = currentState && name && persistent;

      // Note: this is needed to make sure the store is also persisted
      // when the state isn't actively updated after a rehydration.
      if (storeOnUnmount) {
        sessionStorage.setItem(
          name,
          JSON.stringify({
            state: {
              backgroundColor: currentState.backgroundColor,
              backgroundImage: currentState.backgroundImage,
            },
            version,
          }),
        );
      }
    };
  }, []);

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
