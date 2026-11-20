type Watch = Readonly<{
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: number;
  /** "I don't remember": `watchedAt` is when it was marked, not watched */
  dateUnknown?: boolean;
}>;

export type LastWatch = Readonly<{
  seasonNumber: number;
  episodeNumber: number;
  /** null when every regular watch is undated */
  watchedAt: number | null;
}>;

const isLater = (a: Watch, b: Watch) =>
  a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber;

/**
 * The one "last watched" (API and web: Up next's "Last watched S03E10",
 * Paused, the library, a show's place in its list): the newest dated watch
 * of a regular episode, with that episode. Specials and undated marks never
 * count: a Christmas special today or an "I don't remember" bulk mark says
 * nothing about where you are. A season marked at one moment is its highest
 * episode. With only undated marks, the highest of them, with no date.
 */
export const lastWatchOf = (watched: Iterable<Watch>): LastWatch | null => {
  let dated: Watch | null = null;
  let undated: Watch | null = null;
  for (const watch of watched) {
    if (watch.seasonNumber <= 0) continue;
    if (watch.dateUnknown) {
      if (!undated || isLater(watch, undated) > 0) undated = watch;
    } else if (
      !dated ||
      watch.watchedAt > dated.watchedAt ||
      (watch.watchedAt === dated.watchedAt && isLater(watch, dated) > 0)
    ) {
      dated = watch;
    }
  }
  const last = dated ?? undated;
  return last
    ? {
        episodeNumber: last.episodeNumber,
        seasonNumber: last.seasonNumber,
        watchedAt: dated ? dated.watchedAt : null,
      }
    : null;
};
