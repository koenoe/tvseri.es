/**
 * The viewer's show ids per list (`GET /me/library-ids`), for Watched labels,
 * In progress state, relation pills and `+` buttons on cached pages.
 */
export type LibraryIds = Readonly<{
  favorites: ReadonlyArray<number>;
  inProgress: ReadonlyArray<number>;
  watched: ReadonlyArray<number>;
  watchlist: ReadonlyArray<number>;
  /**
   * Every show with a regular episode watched (`GET /me/library-ids` only):
   * also the shows taken out of In progress by hand, which no list holds.
   * Absent while the viewer's summaries are still being built.
   */
  started?: ReadonlyArray<number>;
}>;

/** The four lists a mark can change (`started` only comes from the API) */
export type LibraryList = Exclude<keyof LibraryIds, 'started'>;
