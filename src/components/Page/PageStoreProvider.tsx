'use client';

import {
  type ReactNode,
  createContext,
  useRef,
  useContext,
  useEffect,
} from 'react';

import { useStore } from 'zustand';

import getHistoryKey from '@/utils/getHistoryKey';

import { type PageState, type PageStore, createPageStore } from './store';

export type PageStoreApi = ReturnType<typeof createPageStore>;

export const PageStoreContext = createContext<PageStoreApi | undefined>(
  undefined,
);

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
  const storeRef = useRef<PageStoreApi>();

  if (!storeRef.current) {
    storeRef.current = createPageStore(
      { backgroundColor, backgroundImage },
      `page:${getHistoryKey()}`,
      persistent,
    );
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
