'use client';

import { createContext, type ReactNode, use, useState } from 'react';
import { createStore, type StoreApi, useStore } from 'zustand';

import type { LensKey } from '../../_data/hubTiles';

type LensState = Readonly<{
  lens: LensKey;
  /** the open in-place row's key, or null */
  open: string | null;
  /** the viewer has switched lens: from then on a shown grid fades up */
  switched: boolean;
  selectLens: (lens: LensKey) => void;
  /** opens a tile's row, or closes it when it is the open one */
  toggleRow: (row: string) => void;
  closeRow: () => void;
  /** switches lens and opens one of its rows (the weekend row's "Under 6 hours") */
  openRow: (lens: LensKey, row: string) => void;
}>;

type LensStore = StoreApi<LensState>;

const createLensStore = (): LensStore =>
  createStore<LensState>()((set) => ({
    closeRow: () => set({ open: null }),
    lens: 'duration',
    open: null,
    openRow: (lens, row) => set({ lens, open: row, switched: true }),
    selectLens: (lens) => set({ lens, open: null, switched: true }),
    switched: false,
    toggleRow: (row) =>
      set((current) => ({ open: current.open === row ? null : row })),
  }));

const LensContext = createContext<LensStore | null>(null);

/**
 * The lens tabs' state: which lens is shown and which tile's row is open.
 * One store per page; every reader selects its own answer ("is my lens
 * shown", "is my row open"), so a tab press re-renders the two tabs and two
 * panels it changes, not every tile and row of the six lenses.
 */
export function LensProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [store] = useState(createLensStore);
  return <LensContext value={store}>{children}</LensContext>;
}

/** The lens store itself, for a handler that reads it at the moment it runs */
export function useLensStore(): LensStore {
  const store = use(LensContext);
  if (!store) {
    throw new Error('useLens needs <LensProvider>');
  }
  return store;
}

/** One answer from the lens state (an action, or a primitive like "my row is open") */
export function useLens<T>(select: (state: LensState) => T): T {
  return useStore(useLensStore(), select);
}

/** The DOM id of the tile that opens a row (focus returns to it on close) */
export const tileId = (row: string) => `${row}-tile`;

/** The DOM ids of a lens's tab and its panel (each names the other) */
export const lensTabId = (lens: LensKey) => `lens-${lens}-tab`;
export const lensPanelId = (lens: LensKey) => `lens-${lens}`;
