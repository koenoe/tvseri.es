import { PLEX_HINT_KEY, PLEX_HINT_VERSION } from '@/lib/viewer/htmlHints';

import type { PlexState } from '../../_lib/plexState';

/** Most recent plays the card lists (the API returns at most 5). */
const MAX_RECENT = 5;

/**
 * What the pre-paint script reads (`lib/viewer/htmlHints.ts`): the card's
 * state and how many recent plays it lists, for one account.
 */
export function toPlexHint(
  username: string,
  state: PlexState,
  recent: number,
): string {
  return JSON.stringify({
    n: Math.min(Math.max(recent, 0), MAX_RECENT),
    // A broken card has the waiting card's shape; the pre-paint script
    // knows the board's four states only
    s: state === 'broken' ? 'wait' : state,
    u: username,
    v: PLEX_HINT_VERSION,
  });
}

/**
 * Keeps the hint current: written whenever the card's state is known or
 * changes (the signed-out clean-up is the pre-paint script's). Every access
 * can throw (private mode, blocked storage): then there is no hint and the
 * placeholder is the not-connected card.
 */
export function persistPlexHint(
  username: string | null,
  state: PlexState,
  recent: number,
): void {
  if (!username) {
    return;
  }
  try {
    window.localStorage.setItem(
      PLEX_HINT_KEY,
      toPlexHint(username, state, recent),
    );
  } catch {
    // no storage, no hint
  }
}
