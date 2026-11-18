'use client';

import { createContext, use } from 'react';
import { createStore, type StoreApi, useStore } from 'zustand';

import type { EpisodeRef } from '@/lib/marking/types';

import type { Run, SheetMode } from './paint';
import { readSheetMode } from './sheetMode';

/**
 * The open sheet's own state (one store per opening, so it starts fresh; the mode
 * pill starts as the viewer last left it, "Tap sets a date" the first time): the mode pill, the legend, the last chip touched (detail line), the inline
 * "Mark the N before too?" and the drag run. Components subscribe to slices,
 * so a drag re-renders only the grid it paints.
 */
export type SheetUi = Readonly<{
  mode: SheetMode;
  legend: boolean;
  /** The chip the detail line describes. */
  last: EpisodeRef | null;
  /** The episode a "before it too?" question is about. */
  ask: EpisodeRef | null;
  run: (Run & Readonly<{ seasonNumber: number }>) | null;
}>;

export type SheetUiStore = StoreApi<SheetUi>;

export const createSheetUi = (): SheetUiStore =>
  createStore<SheetUi>()(() => ({
    ask: null,
    last: null,
    legend: false,
    mode: readSheetMode(),
    run: null,
  }));

export const SheetUiContext = createContext<SheetUiStore | null>(null);

export function useSheetUiStore(): SheetUiStore {
  const store = use(SheetUiContext);
  if (!store) {
    throw new Error('useSheetUi needs the history sheet');
  }
  return store;
}

export function useSheetUi<T>(selector: (state: SheetUi) => T): T {
  return useStore(useSheetUiStore(), selector);
}
