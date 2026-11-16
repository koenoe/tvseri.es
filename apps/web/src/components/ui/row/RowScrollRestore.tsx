'use client';

import { useLayoutEffect } from 'react';

import getHistoryKey from '@/lib/navigation/getHistoryKey';
import isBackNavigation from '@/lib/navigation/isBackNavigation';

import { getRowOffset, setRowOffset } from './scrollCache';

type Props = Readonly<{
  railId: string;
  /** unique per row on a page; the history entry's key is added to it */
  restoreKey: string;
}>;

/**
 * Puts a row back where the user left it when they come back with Back, and
 * at the start on any other navigation. Renders nothing.
 *
 * Runs in a layout effect, before paint and never during render: the history
 * key and the direction are external state (see getHistoryKey). The offset is
 * recorded on every scroll, not on unmount, so a route kept hidden by
 * Activity (where the rail has no box) can't overwrite it with 0.
 */
export default function RowScrollRestore({ railId, restoreKey }: Props) {
  useLayoutEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail) {
      return;
    }
    const historyKey = getHistoryKey();
    if (isBackNavigation()) {
      const offset = getRowOffset(restoreKey, historyKey);
      if (offset !== undefined) {
        rail.scrollLeft = offset;
      }
    }
    const record = () => setRowOffset(restoreKey, historyKey, rail.scrollLeft);
    rail.addEventListener('scroll', record, { passive: true });
    return () => rail.removeEventListener('scroll', record);
  }, [railId, restoreKey]);

  return null;
}
