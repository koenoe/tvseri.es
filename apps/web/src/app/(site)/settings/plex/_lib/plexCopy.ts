import type { ActionError } from '@/lib/actions/result';
import type { PlexState } from '../../_lib/plexState';

/**
 * The status line under "Plex". "Receiving" ends
 * with the moment of the last scrobble, drawn in the viewer's time zone next
 * to this text.
 */
export const STATUS_TEXT: Readonly<Record<PlexState, string>> = {
  broken: 'This URL isn’t working · create a new URL',
  none: 'Not connected',
  on: 'Receiving · last scrobble ',
  paused: 'Paused · Plex plays aren’t marked',
  wait: 'Waiting for the first scrobble',
};

export type WhoChoice = 'all' | 'me';

/** "Only <account>" is on while an account is saved as the only one. */
export const whoChoiceOf = (onlyAccountId: number | null): WhoChoice =>
  onlyAccountId === null ? 'all' : 'me';

/**
 * The line under "Whose plays count". Until a scrobble has named an account
 * there is nobody to limit it to (the API refuses any other id).
 */
export function whoLine(choice: WhoChoice, hasAccount: boolean): string {
  if (!hasAccount) {
    return 'Once Plex has sent a play, you can limit it to that account.';
  }
  return choice === 'me'
    ? 'Plays by other Plex users on your server are ignored.'
    : 'Every play on your server marks your history.';
}

/** What a failed Plex write says (never the API's own text). */
export const PLEX_ERROR_TEXT: Readonly<Record<ActionError, string>> = {
  failed: 'That didn’t save. Try again.',
  invalid: 'Plex doesn’t allow that right now.',
  'not-found': 'Plex isn’t connected any more.',
  unauthenticated: 'Sign in again to change this.',
};
