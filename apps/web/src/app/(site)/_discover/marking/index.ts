/**
 * The discover pages' door to the viewer's marks on cached tiles, over the
 * marking core (`@/lib/marking`):
 * `useIsWatched(id)` / `useWatchedCount(ids)`, the viewer's watched shows
 * for Watched labels and "You’ve seen" lines, loaded on the client (cached
 * pages hold no user data). The Watchlist + Seen it control is the shared
 * `MarkControl` (`components/marking`).
 */
export { useIsWatched, useWatchedCount } from './useWatched';
