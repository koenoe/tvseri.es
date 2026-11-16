import type { RecentScrobble } from '@tvseri.es/schemas';

const keyOf = (mark: RecentScrobble) =>
  `${mark.seriesId}-${mark.seasonNumber}-${mark.episodeNumber}-${mark.watchedAt}`;

/**
 * The status's latest marks and its week as one list, newest first, each
 * mark once: the latest are Plex's newest marks, so they are the list's
 * first `recent.length`, and the week's marks follow.
 */
export function scrobbleMarks(
  recent: ReadonlyArray<RecentScrobble>,
  week: ReadonlyArray<RecentScrobble>,
): ReadonlyArray<RecentScrobble> {
  const seen = new Set(recent.map(keyOf));
  return [...recent, ...week.filter((mark) => !seen.has(keyOf(mark)))];
}
