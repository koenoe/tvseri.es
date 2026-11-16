import type {
  LibraryCounts,
  LibraryIds,
  LibraryOn,
  LibraryShelf,
  WatchingNow,
} from '@tvseri.es/schemas';

/**
 * One show in a user's library: every list item of the show and its prefs,
 * merged. Dates are epoch ms; null = not on that list.
 */
export type LibraryEntry = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterPath: string | null;
  /** WATCHLIST `createdAt`: when it was added */
  watchlistAt: number | null;
  /** FAVORITES `createdAt`: when it was added */
  favouriteAt: number | null;
  /** WATCHED (Finished) `createdAt`: the show's latest watch when it finished */
  finishedAt: number | null;
  /** IN_PROGRESS `createdAt`: the show's latest watch (see the contract) */
  activeAt: number | null;
  /** prefs `pausedAt` when `paused` is `hide` and the show is In progress */
  hiddenAt: number | null;
}>;

type Owner = Readonly<{ owner: boolean }>;

const isWatching = (entry: LibraryEntry) =>
  entry.activeAt !== null && entry.hiddenAt === null;

/** Whether the show sits on the shelf. Hidden is the owner's only; Watching leaves hidden shows out for everyone */
export const isOnShelf = (
  entry: LibraryEntry,
  shelf: LibraryShelf,
  { owner }: Owner,
): boolean => {
  switch (shelf) {
    case 'watching':
      return isWatching(entry);
    case 'watchlist':
      return entry.watchlistAt !== null;
    case 'finished':
      return entry.finishedAt !== null;
    case 'favourites':
      return entry.favouriteAt !== null;
    case 'all':
      return true;
    case 'hidden':
      return owner && entry.hiddenAt !== null;
  }
};

/** The latest of a show's dates: All's "Recently active" */
const latestDate = (entry: LibraryEntry): number =>
  Math.max(
    entry.activeAt ?? 0,
    entry.watchlistAt ?? 0,
    entry.favouriteAt ?? 0,
    entry.finishedAt ?? 0,
    entry.hiddenAt ?? 0,
  );

/** The shelf's own date for a show on it (the tile's `addedAt`, the date sorts' key) */
export const shelfDate = (entry: LibraryEntry, shelf: LibraryShelf): number => {
  switch (shelf) {
    case 'watching':
      return entry.activeAt ?? 0;
    case 'watchlist':
      return entry.watchlistAt ?? 0;
    case 'finished':
      return entry.finishedAt ?? 0;
    case 'favourites':
      return entry.favouriteAt ?? 0;
    case 'hidden':
      return entry.hiddenAt ?? 0;
    case 'all':
      return latestDate(entry);
  }
};

/** Which shelves a show sits on, as the tiles draw it (a visitor never sees `hidden`) */
export const shelvesOf = (
  entry: LibraryEntry,
  { owner }: Owner,
): LibraryOn => ({
  favourite: entry.favouriteAt !== null,
  finished: entry.finishedAt !== null,
  hidden: owner && entry.hiddenAt !== null,
  watching: isWatching(entry),
  watchlist: entry.watchlistAt !== null,
});

/** Every shelf's count; `hidden` is null for a visitor. All counts each show once */
export const shelfCounts = (
  entries: ReadonlyArray<LibraryEntry>,
  { owner }: Owner,
): LibraryCounts => {
  const count = (shelf: LibraryShelf) =>
    entries.filter((entry) => isOnShelf(entry, shelf, { owner })).length;
  return {
    all: entries.length,
    favourites: count('favourites'),
    finished: count('finished'),
    hidden: owner ? count('hidden') : null,
    watching: count('watching'),
    watchlist: count('watchlist'),
  };
};

/**
 * The show ids per list, as `getLibraryIds` reads them (hidden shows are
 * still in progress): what the taste match compares.
 */
export const toLibraryIds = (
  entries: ReadonlyArray<LibraryEntry>,
): LibraryIds => {
  const ids = (date: (entry: LibraryEntry) => number | null) =>
    entries
      .filter((entry) => date(entry) !== null)
      .map((entry) => entry.id)
      .sort((a, b) => a - b);
  return {
    favorites: ids((entry) => entry.favouriteAt),
    inProgress: ids((entry) => entry.activeAt),
    watched: ids((entry) => entry.finishedAt),
    watchlist: ids((entry) => entry.watchlistAt),
  };
};

/** What someone is watching now: their latest In progress show they haven't hidden */
export const watchingNow = (
  entries: ReadonlyArray<LibraryEntry>,
): WatchingNow | null => {
  let latest: LibraryEntry | null = null;
  for (const entry of entries) {
    if (
      isWatching(entry) &&
      (!latest ||
        (entry.activeAt ?? 0) > (latest.activeAt ?? 0) ||
        ((entry.activeAt ?? 0) === (latest.activeAt ?? 0) &&
          entry.id < latest.id))
    ) {
      latest = entry;
    }
  }
  return latest
    ? { seriesId: latest.id, slug: latest.slug, title: latest.title }
    : null;
};
