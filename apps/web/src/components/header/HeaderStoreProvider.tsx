'use client';

import { createContext, type ReactNode, use, useState } from 'react';
import { useStore } from 'zustand';

import type { HeaderMode } from './headerMode';
import { createHeaderStore, type HeaderStore } from './store';

type HeaderStoreApi = ReturnType<typeof createHeaderStore>;

const HeaderStoreContext = createContext<HeaderStoreApi | null>(null);

/**
 * One store per header: its mode (static, pill, hidden) and the menu. Shared
 * by the frame, the logo, the search button and the menu.
 */
export function HeaderStoreProvider({
  children,
  initialMode,
}: Readonly<{
  children: ReactNode;
  /** Only for the style guide, which shows each mode without scrolling. */
  initialMode?: HeaderMode;
}>) {
  const [store] = useState(() => createHeaderStore(initialMode));

  return <HeaderStoreContext value={store}>{children}</HeaderStoreContext>;
}

export function useHeaderStore<T>(selector: (store: HeaderStore) => T): T {
  const store = use(HeaderStoreContext);

  if (!store) {
    throw new Error(
      'useHeaderStore must be used within <HeaderStoreProvider />',
    );
  }

  return useStore(store, selector);
}
