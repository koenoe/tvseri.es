'use client';

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
} from 'react';

import { useStore } from 'zustand';

import { createWatchedStore, type WatchedStore } from './store';

export type WatchedStoreApi = ReturnType<typeof createWatchedStore>;

const WatchedStoreContext = createContext<WatchedStoreApi | null>(null);

const WatchedStoreProvider = ({ children }: PropsWithChildren) => {
  const storeRef = useRef<WatchedStoreApi>(null);
  if (!storeRef.current) {
    storeRef.current = createWatchedStore();
  }

  return (
    <WatchedStoreContext.Provider value={storeRef.current}>
      {children}
    </WatchedStoreContext.Provider>
  );
};

export const useWatchedStore = <T,>(
  selector: (store: WatchedStore) => T,
): T => {
  const watchedStoreContext = useContext(WatchedStoreContext);

  if (!watchedStoreContext) {
    throw new Error(
      'useWatchedStore must be used within <WatchedStoreProvider />',
    );
  }

  return useStore(watchedStoreContext, selector);
};

export default WatchedStoreProvider;
