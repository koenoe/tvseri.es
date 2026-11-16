import { plural } from '@/lib/format/text';
import type { AppsActionError } from '../../_lib/appsResult';

/** The dialog's subline, naming the history it deletes. */
export const deleteDialogText = (episodes: number | null) =>
  `Your history${episodes === null ? '' : ` (${plural(episodes, 'episode')})`}, watchlist, favourites, Plex link and profile are deleted for good. Download your data first if you want a copy.`;

/** What a refused delete says in the dialog, never the API's own text. */
export function deleteErrorText(error: AppsActionError): string {
  switch (error) {
    case 'not-enabled':
      return 'Deleting accounts isn’t switched on yet.';
    case 'mismatch':
      return 'That isn’t your username.';
    case 'unauthenticated':
      return 'You’re signed out. Sign in again to delete your account.';
    default:
      return 'Couldn’t delete your account. Try again.';
  }
}
