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
  const storeRef = useRef<PageStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createPageStore(
      { backgroundColor, backgroundImage },
      getStoreName(),
    );
  }

  useEffect(() => {
    const name = getStoreName();
    // Note: storeRef.current?.persist.getOptions().name gives weird results ¯\_(ツ)_/¯
    const cachedState = sessionStorage.getItem(name);
    if (cachedState) {
      sessionStorage.removeItem(name);
      try {
        const parsedCachedState = JSON.parse(cachedState);
        storeRef.current?.setState((state) => ({
          ...state,
          ...parsedCachedState,
        }));
      } catch (error) {
        console.error('Failed to parse cached state', error);
      }
    }

    return () => {
      if (storeRef.current) {
        const state = storeRef.current.getState();
        const initialState = storeRef.current.getInitialState();
        if (
          state.backgroundColor !== initialState.backgroundColor &&
          state.backgroundImage !== initialState.backgroundImage
        ) {
          sessionStorage.setItem(
            name,
            JSON.stringify({
              backgroundColor: state.backgroundColor,
              backgroundImage: state.backgroundImage,
            }),
          );
        }
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
