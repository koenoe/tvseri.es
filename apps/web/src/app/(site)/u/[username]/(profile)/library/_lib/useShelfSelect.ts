'use client';

import type { LibraryShelf } from '@tvseri.es/schemas';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { showToast } from '@/components/ui/toast/showToast';
import useBulk from '@/lib/marking/useBulk';
import type { TileView } from '@/lib/profile/tileView';
import { bumpCounts } from '../../_lib/shelfCounts';
import { createSelectionStore, SELECT_MAX } from './selection';
import { SHELVES } from './shelves';
import type { LeaveReason } from './useShelfTiles';

/** The pick past the cap */
const capped = () =>
  showToast({ title: `Up to ${SELECT_MAX} at a time`, tone: 'error' });

/**
 * A shelf's Select mode: the selection store (one per grid), whether it is
 * on, `leave` (a tile leaving its shelf also leaves the selection), Escape
 * to stop, and the tiles' context (leave, long press, pick with shift-range
 * over the tiles' current order), and `act`: the shelf's bulk action on the
 * picked tiles. Only `selecting` re-renders the grid: the count is the action
 * bar's own read, so a pick re-renders the bar and the picked tile.
 */
export default function useShelfSelect({
  comeBack,
  leaveShelf,
  owner,
  shelf,
  tiles,
  username,
}: Readonly<{
  /** `useShelfTiles`' come back: tiles whose write failed return */
  comeBack: (ids: ReadonlyArray<number>, reason: LeaveReason) => void;
  /** `useShelfTiles`' leave: the tiles and the counts */
  leaveShelf: (ids: ReadonlyArray<number>, reason: LeaveReason) => void;
  owner: boolean;
  shelf: LibraryShelf;
  tiles: ReadonlyArray<TileView>;
  username: string;
}>) {
  const router = useRouter();
  const bulk = useBulk();
  const [selection] = useState(createSelectionStore);
  const selecting = useStore(selection, (state) => state.selecting);

  const leave = useCallback(
    (ids: ReadonlyArray<number>, reason: LeaveReason) => {
      leaveShelf(ids, reason);
      selection.getState().forget(ids);
    },
    [leaveShelf, selection],
  );

  const order = useRef<ReadonlyArray<number>>([]);
  order.current = tiles.map((tile) => tile.id);

  const context = useMemo(
    () => ({
      leave: (id: number, reason: LeaveReason) => leave([id], reason),
      longPress: (id: number) => {
        const state = selection.getState();
        if (!state.selecting) {
          state.start();
        }
        if (!state.selected.has(id) && state.toggle(id) === 'capped') {
          capped();
        }
      },
      owner,
      pick: (id: number, range: boolean) => {
        const result = selection
          .getState()
          .toggle(id, { order: order.current, range });
        if (result === 'capped') {
          capped();
        }
      },
      selection,
      shelf,
    }),
    [leave, owner, selection, shelf],
  );

  // Escape leaves select mode
  useEffect(() => {
    if (!selecting) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        selection.getState().stop();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selecting, selection]);

  const act = async () => {
    const action = SHELVES[shelf].action;
    if (!action) {
      return;
    }
    const picked = tiles.filter((tile) =>
      selection.getState().selected.has(tile.id),
    );
    const items = picked.map((tile) => ({
      addedAt: tile.addedAt,
      id: tile.id,
    }));
    const ids = picked.map((tile) => tile.id);
    selection.getState().stop();
    // Finished's action adds a heart; the others take the show off the shelf
    const reason =
      action.op === 'favourites-add' ? null : (action.op as LeaveReason);
    if (reason) {
      leave(ids, reason);
    } else {
      bumpCounts(username, {
        favourites: picked.filter((tile) => !tile.on.favourite).length,
      });
    }
    const result = await bulk(action.op, items, {
      onUndone: () => router.refresh(),
    });
    if (reason && result.failed.length > 0) {
      comeBack(result.failed, reason);
    }
  };

  return { act, context, selecting, selection } as const;
}
