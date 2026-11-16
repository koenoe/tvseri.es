'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  type ControlState,
  controlKey,
  liveControlState,
} from './controlState';
import { useLoadLibraryIds } from './hooks';
import { useMarkingStoreApi } from './MarkingProvider';

/**
 * A marking control's state (`liveControlState`): the server-streamed state
 * on the server and through hydration, so the first client render is the
 * streamed HTML; then the tab's marking store (the library ids, loaded once
 * per tab, and any seeded show), so a press here or a mark anywhere in the
 * tab (the Remote, the eye on a tile) moves the control, and Undo moves it
 * back. Re-renders only when this control's answer changes.
 */
export default function useControlState(
  seriesId: number,
  streamed: ControlState,
): ControlState {
  const store = useMarkingStoreApi();
  const streamedKey = controlKey(streamed);
  const read = useCallback(() => {
    const { library, series } = store.getState();
    return controlKey(
      liveControlState(
        streamed,
        series[seriesId]?.view,
        library.status === 'ready' ? library.ids : null,
        seriesId,
      ),
    );
  }, [seriesId, store, streamed]);
  const serverRead = useCallback(() => streamedKey, [streamedKey]);
  const key = useSyncExternalStore(store.subscribe, read, serverRead);
  useLoadLibraryIds();
  return useMemo(
    () => (key === streamedKey ? streamed : (JSON.parse(key) as ControlState)),
    [key, streamed, streamedKey],
  );
}
