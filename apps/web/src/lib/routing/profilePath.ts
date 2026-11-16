import type {
  LibraryFilter,
  LibraryShelf,
  LibrarySort,
} from '@tvseri.es/schemas';

/**
 * The pages under `/u/{username}` ('' = the overview). Typed, so a link to
 * one of the old pages (In progress, Favorites, Social…) can't be built:
 * those URLs only live on as redirects.
 */
export type ProfileSegment =
  | ''
  | 'circle'
  | 'history'
  | 'library'
  | `library/${LibraryShelf}`;

/**
 * A user's profile URL: `/u/{username}` (the overview) or
 * `/u/{username}/{segment}` (`history`, `circle`, `library`,
 * `library/{shelf}`), the username encoded. The Library's links go through
 * `libraryPath`; Stats has its own builder, `statsPath`.
 */
export default function profilePath(
  username: string,
  segment: ProfileSegment = '',
): string {
  return `/u/${encodeURIComponent(username)}${segment ? `/${segment}` : ''}`;
}

/** What a Library URL can carry besides its shelf */
type LibraryLinkQuery = Readonly<{
  /** The A–Z rail's letter (`a`–`z`, `#`), with `sort: 'az'` */
  from?: string;
  /** Find */
  q?: string;
  sort?: LibrarySort;
  /** A visitor's filter: New to you or You both */
  with?: LibraryFilter;
}>;

/**
 * A Library URL: `/u/{username}/library` (the default shelf: yours opens on
 * Watching, someone else's on Favourites), or a shelf with its query, keys
 * in a fixed order and empty values left out:
 * `libraryPath('edw1n', 'favourites', { with: 'new' })`.
 */
export function libraryPath(
  username: string,
  shelf?: LibraryShelf,
  query: LibraryLinkQuery = {},
): string {
  const path = profilePath(username, shelf ? `library/${shelf}` : 'library');
  const search = new URLSearchParams();
  for (const key of ['from', 'q', 'sort', 'with'] as const) {
    const value = query[key];
    if (value) {
      search.set(key, value);
    }
  }
  const queryString = search.toString();
  return queryString ? `${path}?${queryString}` : path;
}
