'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
} from 'react';

import { useStore } from 'zustand';

import getHistoryKey from '@/utils/getHistoryKey';

import { createPageStore, type PageState, type PageStore } from './store';

export type PageStoreApi = ReturnType<typeof createPageStore>;

const PageStoreContext = createContext<PageStoreApi | null>(null);

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

  // Clear sessionStorage on refresh to start fresh
  useEffect(() => {
    const name = storeRef.current?.persist?.getOptions()?.name;
    if (!name) return;

    const handleBeforeUnload = () => {
      sessionStorage.removeItem(name);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const onSaveState = useEffectEvent(() => {
    const store = storeRef.current;
    if (!store || !persistent) return;

    const name = store.persist?.getOptions()?.name ?? '';
    const version = store.persist?.getOptions()?.version ?? 0;
    const currentState = store.getState();

    if (currentState && name) {
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
  });

  // Save state on unmount (navigation, not refresh)
  useEffect(() => {
    return () => onSaveState();
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
