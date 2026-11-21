'use client';

import { useState } from 'react';

type Seen = Readonly<{ lastSyncedAt: number | null; linked: boolean }>;

/**
 * A link's first sync ending while this page shows it: the service was
 * linked with no sync yet, and now has its first sync time. Never on the
 * card's arrival, a later sync, or a link that arrives with its history.
 */
const landedFirstSync = (was: Seen, now: Seen): boolean =>
  was.linked &&
  now.linked &&
  was.lastSyncedAt === null &&
  now.lastSyncedAt !== null;

/**
 * Counts the first syncs that ended on this page, as a key (0: none):
 * the card rings once for each (`ServicePanel`).
 */
export default function useFirstSyncLanded(
  lastSyncedAt: number | null,
  linked: boolean,
): number {
  const [seen, setSeen] = useState<Seen>({ lastSyncedAt, linked });
  const [landed, setLanded] = useState(0);
  if (seen.lastSyncedAt !== lastSyncedAt || seen.linked !== linked) {
    const now = { lastSyncedAt, linked };
    setSeen(now);
    if (landedFirstSync(seen, now)) {
      setLanded(landed + 1);
    }
  }
  return landed;
}
