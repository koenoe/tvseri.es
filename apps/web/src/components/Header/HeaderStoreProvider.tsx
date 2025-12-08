'use client';

import { createContext, type ReactNode, useContext, useRef } from 'react';

import { useStore } from 'zustand';

import { createHeaderStore, type HeaderStore } from './store';

export type HeaderStoreApi = ReturnType<typeof createHeaderStore>;

// Create a fallback store for use outside provider (e.g., Footer's Logo)
const fallbackStore = createHeaderStore();

const HeaderStoreContext = createContext<HeaderStoreApi>(fallbackStore);

export const HeaderStoreProvider = ({
  children,
}: Readonly<{ children: ReactNode }>) => {
  const storeRef = useRef<HeaderStoreApi>(null);

  if (!storeRef.current) {
    storeRef.current = createHeaderStore();
  }

  return (
    <HeaderStoreContext.Provider value={storeRef.current}>
      {children}
    </HeaderStoreContext.Provider>
  );
};

export const useHeaderStore = <T,>(selector: (store: HeaderStore) => T): T => {
  const headerStoreContext = useContext(HeaderStoreContext);
  return useStore(headerStoreContext, selector);
};
