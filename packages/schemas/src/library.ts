/**
 * The viewer's show ids per list (`GET /me/library-ids`), for Watched labels,
 * In progress state, relation pills and `+` buttons on cached pages.
 */
export type LibraryIds = Readonly<{
  favorites: ReadonlyArray<number>;
  inProgress: ReadonlyArray<number>;
  watched: ReadonlyArray<number>;
  watchlist: ReadonlyArray<number>;
}>;
