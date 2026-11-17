'use client';

import { PresenceContext } from 'motion/react';
import { type ReactNode, use, useMemo } from 'react';

/**
 * A dialog on a page the router hides in its back/forward cache (React
 * Activity) comes back as it was left. Motion would reset its motion values
 * to `initial` when React shows them again: on Back the episode modal
 * flashed on its tile, faded backdrop and all, before snapping back. Only
 * once the entry has played (`keep`): until then a remount (content that
 * suspends while the panel grows) replays the entry, as it always did.
 */
export default function KeepValuesOnRemount({
  children,
  keep,
}: Readonly<{ children: ReactNode; keep: boolean }>) {
  const presence = use(PresenceContext);
  const kept = useMemo(
    () => (presence ? { ...presence, keepValuesOnRemount: keep } : null),
    [keep, presence],
  );
  return <PresenceContext value={kept}>{children}</PresenceContext>;
}
