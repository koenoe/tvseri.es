'use client';

import { useSyncExternalStore } from 'react';

import { localDay, subscribeToMinute } from './dayClock';

const unknownOnServer = () => null;

/**
 * The viewer's today (`YYYY-MM-DD`), or null on the server and during
 * hydration: pages are cached, so the server can't know the viewer's day.
 * React renders null first on the client too, then the real day, so the HTML
 * and the first client render always match. Checked once a minute, so a tab
 * left open past midnight moves on to the new day.
 */
export const useLocalDay = (): string | null =>
  useSyncExternalStore(subscribeToMinute, localDay, unknownOnServer);
