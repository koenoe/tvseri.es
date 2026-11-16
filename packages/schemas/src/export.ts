import type { SeriesPrefs } from './series-prefs';
import type { User } from './user';
import type { ExportedWatchedItem } from './watched';

export type ExportedListItem = Readonly<{
  /** When it was added (epoch ms) */
  addedAt: number;
  id: number;
  title: string;
}>;

export type ExportedPerson = Readonly<{ id: string; username: string }>;

/**
 * `GET /me/export/everything.json`: everything stored about the viewer, minus
 * internal fields (role, version, activity) and secrets: a Plex link is only
 * said to exist, its token is never included.
 */
export type ExportEverything = Readonly<{
  connections: Readonly<{ plex: boolean }>;
  exportedAt: string;
  followers: ReadonlyArray<ExportedPerson>;
  following: ReadonlyArray<ExportedPerson>;
  /** By list: FAVORITES, WATCHLIST, WATCHED, IN_PROGRESS... */
  lists: Readonly<Record<string, ReadonlyArray<ExportedListItem>>>;
  prefs: ReadonlyArray<Readonly<{ seriesId: number }> & SeriesPrefs>;
  profile: Omit<User, 'role' | 'version'>;
  watched: ReadonlyArray<ExportedWatchedItem>;
}>;
