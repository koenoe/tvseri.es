import type { PlexState } from '../../_lib/plexState';
import { appErrorText } from './appState';

/**
 * The status line under "Plex". "Receiving" is followed by the last
 * scrobble's time, drawn in the viewer's time zone.
 */
export const STATUS_TEXT: Readonly<Record<PlexState, string>> = {
  broken: 'This URL isn’t working · create a new URL',
  none: 'Not connected',
  on: 'Receiving · last scrobble ',
  paused: 'Paused · Plex plays aren’t marked',
  wait: 'Waiting for the first scrobble',
};

export const plexSteps = (hasUrl: boolean): ReadonlyArray<string> => [
  hasUrl
    ? 'Copy your URL. It’s yours alone: anyone with it can mark episodes on your profile.'
    : 'Create and copy your URL. It’s yours alone: anyone with it can mark episodes on your profile.',
  'In Plex: Settings → Webhooks (under your account) → Add Webhook.',
  'Paste it, Save Changes, and finish any episode: it shows up here.',
];

export type WhoChoice = 'all' | 'me';

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
export const PLEX_ERROR_TEXT = appErrorText('Plex');
