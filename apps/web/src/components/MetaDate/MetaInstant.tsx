'use client';

import { useSyncExternalStore } from 'react';

import { formatMetaDateParts } from '@/utils/formatDate';

import MetaDate from './MetaDate';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * An instant (like `watchedAt`) for a meta row, in the viewer's time zone:
 * "Nov 9" in the current year, "Oct 3, 2024" in any other; nothing when it's
 * invalid.
 * The server doesn't know the viewer's zone, so this renders nothing on the
 * server and during hydration, and the date in the browser. Inside a
 * client-only subtree (the watch date picker) it renders straight away.
 */
export default function MetaInstant({
  value,
}: Readonly<{
  value: number;
}>) {
  const isBrowser = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!isBrowser) {
    return null;
  }

  const parts = formatMetaDateParts(value, 'instant');
  if (!parts) {
    return null;
  }

  return <MetaDate monthDay={parts.monthDay} year={parts.year} />;
}
