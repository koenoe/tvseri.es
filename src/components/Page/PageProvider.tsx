'use client';

import { type ReactNode, createContext, useRef, useContext } from 'react';

import { useStore } from 'zustand';

import { type PageState, type PageStore, createPageStore } from './store';

export type PageStoreApi = ReturnType<typeof createPageStore>;

export const PageStoreContext = createContext<PageStoreApi | undefined>(
  undefined,
);

export type PageStoreProviderProps = PageState & {
  children: ReactNode;
};

export const PageStoreProvider = ({
  backgroundColor,
  backgroundImage,
  children,
}: PageStoreProviderProps) => {
  const storeRef = useRef<PageStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createPageStore({ backgroundColor, backgroundImage });
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
