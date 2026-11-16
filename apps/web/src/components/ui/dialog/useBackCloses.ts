'use client';

import { useCallback, useEffect, useRef } from 'react';

import { holdPanelEntry, leavePanelEntry } from './panelHistory';

/**
 * Back closes an open side panel that has no URL of its own (the awards
 * sheet), through its own history entry (`panelHistory.ts`, shared with the
 * menu). Returns the close for ✕, Escape and the dimmed page: it goes back
 * over that entry, so none stays behind.
 */
export default function useBackCloses(
  open: boolean,
  close: () => void,
): () => void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  // the open state synced with the browser's history: an external system
  useEffect(() => {
    if (!open) {
      return;
    }
    return holdPanelEntry(() => closeRef.current());
  }, [open]);

  return useCallback(() => {
    // the popstate closes it
    if (!leavePanelEntry()) {
      closeRef.current();
    }
  }, []);
}
