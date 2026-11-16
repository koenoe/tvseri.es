'use client';

import type { LibraryShelf } from '@tvseri.es/schemas';
import { createContext, use } from 'react';

import type { SelectionStore } from '../_lib/selection';
import type { LeaveReason } from '../_lib/useShelfTiles';

export type TileContextValue = Readonly<{
  owner: boolean;
  shelf: LibraryShelf;
  selection: SelectionStore;
  /** A click in select mode: toggles, Shift adds the run */
  pick: (id: number, range: boolean) => void;
  /** A phone's long-press: starts select mode with this tile */
  longPress: (id: number) => void;
  /** The tile's show left the shelf (the Remote's H, W or F) */
  leave: (id: number, reason: LeaveReason) => void;
}>;

export const TileContext = createContext<TileContextValue | null>(null);

export function useTileContext(): TileContextValue {
  const value = use(TileContext);
  if (!value) {
    throw new Error('Library tiles need their grid');
  }
  return value;
}
