import type { WebhookStatus } from '@tvseri.es/schemas';

/**
 * The four states, plus `broken`: connected, but the edge refuses the
 * URL (its key is missing and couldn't be written), so nothing can arrive.
 */
export type PlexState = 'none' | 'wait' | 'on' | 'paused' | 'broken';

/** The state from its facts (the card derives it again while a pause is optimistic). */
export function plexStateFrom(
  connected: boolean,
  paused: boolean,
  receivedBefore: boolean,
  urlWorks = true,
): PlexState {
  if (!connected) {
    return 'none';
  }
  if (!urlWorks) {
    return 'broken';
  }
  if (paused) {
    return 'paused';
  }
  return receivedBefore ? 'on' : 'wait';
}

/** The four Plex states. Pure: client code uses it too. */
export function plexStateOf(status: WebhookStatus): PlexState {
  return status.connected
    ? plexStateFrom(
        true,
        status.paused,
        status.lastReceivedAt !== null,
        status.urlWorks,
      )
    : 'none';
}
