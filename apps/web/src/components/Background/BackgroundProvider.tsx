'use client';

import { createContext, type ReactNode, use, useEffect, useRef } from 'react';
import { useStore } from 'zustand';

import {
  getBackground,
  getHistoryKey,
  isBackNavigation,
  setBackground,
} from './cache';
import {
  type BackgroundState,
  type BackgroundStore,
  createBackgroundStore,
} from './store';

type BackgroundStoreApi = ReturnType<typeof createBackgroundStore>;

const BackgroundContext = createContext<BackgroundStoreApi | null>(null);

type BackgroundProviderProps = Readonly<{
  children: ReactNode;
  initialColor: string;
  initialImage: string;
}>;

/**
 * BackgroundProvider manages background color state for SPA navigation.
 * Uses module-level Map cache for back-nav restoration.
 *
 * @see state-lift-state - Move state into provider for sibling access
 * @see js-cache-function-results - Module-level Map for caching
 */
export function BackgroundProvider({
  children,
  initialColor,
  initialImage,
}: BackgroundProviderProps) {
  const historyKeyRef = useRef(getHistoryKey());
  const storeRef = useRef<BackgroundStoreApi>(null);

  if (!storeRef.current) {
    // Check cache first (for back navigation)
    const cached = isBackNavigation()
      ? getBackground(historyKeyRef.current)
      : null;
    const initialState: BackgroundState = cached ?? {
      backgroundColor: initialColor,
      backgroundImage: initialImage,
    };

    storeRef.current = createBackgroundStore(initialState);
  }

  // Save to cache on unmount (for future back-nav restoration)
  useEffect(() => {
    const store = storeRef.current;
    const key = historyKeyRef.current;

    return () => {
      if (store) {
        const state = store.getState();
        setBackground(key, {
          backgroundColor: state.backgroundColor,
          backgroundImage: state.backgroundImage,
        });
      }
    };
  }, []);

  // Sync CSS variable on mount and when color changes (for client-side updates)
  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    // Set initial color on mount - this is critical for forward navigation
    // where the previous page's inline style may still be on document.documentElement
    const initialState = store.getState();
    document.documentElement.style.setProperty(
      '--main-background-color',
      initialState.backgroundColor,
    );

    // Subscribe to future changes
    const unsubscribe = store.subscribe((state) => {
      document.documentElement.style.setProperty(
        '--main-background-color',
        state.backgroundColor,
      );
    });

    return unsubscribe;
  }, []);

  return (
    <BackgroundContext.Provider value={storeRef.current}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground<T>(selector: (store: BackgroundStore) => T): T {
  const context = use(BackgroundContext);

  if (!context) {
    throw new Error('useBackground must be used within <BackgroundProvider />');
  }

  return useStore(context, selector);
}
