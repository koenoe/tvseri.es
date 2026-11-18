'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
// One clock reading per page load: `getSnapshot` must return a stable value.
let loadedAt: number | null = null;
const getNow = () => {
  loadedAt ??= Date.now();
  return loadedAt;
};
const getServerNow = () => null;

/**
 * Not the day clock (`lib/viewer/dayClock`): a fixed reading, because
 * `LocalMoment` needs a moment's words ("21:14 today") to stay put while read.
 *
 * "Now" for local-time words: `null` on the server and in the hydration
 * pass (the server doesn't know the viewer's zone, so nothing zoned is in
 * the HTML), then the page load's clock reading in the browser.
 */
export const useLoadedNow = (): number | null =>
  useSyncExternalStore(subscribe, getNow, getServerNow);
