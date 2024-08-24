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
};

const getStoreName = () => `page:${getHistoryKey()}`;

export const PageStoreProvider = ({
  backgroundColor,
  backgroundImage,
  children,
}: PageStoreProviderProps) => {
  const storeRef = useRef<PageStoreApi>(
    createPageStore({ backgroundColor, backgroundImage }, getStoreName()),
  );

  useEffect(() => {
    const store = storeRef.current;
    const persistOptions = store.persist.getOptions();
    const name = persistOptions.name as string;
    const version = persistOptions.version;

    return () => {
      const currentState = store.getState();

      if (currentState) {
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
