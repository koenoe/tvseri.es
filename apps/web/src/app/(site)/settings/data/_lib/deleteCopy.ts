import { plural } from '@tvseri.es/utils';
import type { DeleteAccountError } from '../actions';

/** The dialog's subline, naming the history it deletes. */
export const deleteDialogText = (episodes: number | null) =>
  `Your history${episodes === null ? '' : ` (${plural(episodes, 'episode')})`}, watchlist, favourites, Plex link and profile are deleted for good. Download your data first if you want a copy.`;

/** What a refused delete says in the dialog, never the API's own text. */
export function deleteErrorText(error: DeleteAccountError): string {
  switch (error) {
    case 'mismatch':
      return 'That isn’t your username.';
    case 'unauthenticated':
      return 'You’re signed out. Sign in again to delete your account.';
    default:
      return 'Couldn’t delete your account. Try again.';
  }
}
