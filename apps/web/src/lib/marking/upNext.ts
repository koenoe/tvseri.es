import { toEpisodeCode, type UpNextItem } from '@tvseri.es/schemas';
import { episodeMinutes, minutesFor } from '@tvseri.es/utils';

import {
  airedInSeason,
  airedRegularEpisodes,
  codeOf,
  markedIn,
  parseCode,
} from './progress';
import type { SeriesBase } from './types';

const sameRef = (
  a: Readonly<{ seasonNumber: number; episodeNumber: number }> | undefined,
  b: Readonly<{ seasonNumber: number; episodeNumber: number }>,
) =>
  a !== undefined &&
  a.seasonNumber === b.seasonNumber &&
  a.episodeNumber === b.episodeNumber;

/** The latest regular episode watched (by number, the overview's rule) and the latest dated watch */
function lastWatched(view: SeriesBase) {
  let code: string | null = null;
  let best = -1;
  let at: number | null = null;
  for (const [key, record] of Object.entries(view.watched)) {
    const ref = parseCode(key);
    if (ref && ref.seasonNumber > 0) {
      const rank = ref.seasonNumber * 10_000 + ref.episodeNumber;
      if (rank > best) {
        best = rank;
        code = key;
      }
    }
    if (!record.dateUnknown && (at === null || record.watchedAt > at)) {
      at = record.watchedAt;
    }
  }
  return { at, code };
}

/**
 * An Up next item (`GET /me/overview`) as the marking store has the show
 * now. Anchored on the server's episode: while the store has it unmarked
 * the item is the server's, untouched (a seed alone never moves it, even if
 * the store's idea of "aired" differs a little from the overview's). Once
 * that episode is marked (the eye, the Remote, the show page in the same
 * tab) the item moves on to the next aired episode after it with nothing on
 * it, with the season's counts, "Last watched" and the finale / latest flags
 * re-derived by the overview's rules; an Undo moves it back. `null` when no
 * aired episode is left after it (the show leaves Up next, as it does on the
 * next load).
 */
export function liveUpNext(
  item: UpNextItem,
  view: SeriesBase | undefined,
): UpNextItem | null {
  if (!view) {
    return item;
  }
  const isMarked = markedIn(view);
  if (!isMarked(item.code)) {
    return item;
  }
  const aired = airedRegularEpisodes(view);
  const at = aired.findIndex(
    (ref) =>
      ref.seasonNumber === item.season && ref.episodeNumber === item.episode,
  );
  const next = aired.slice(at + 1).find((ref) => !isMarked(codeOf(ref)));
  if (!next) {
    return null;
  }
  const inSeason = airedInSeason(view, next.seasonNumber);
  const seasonWatched = Object.keys(view.watched).filter(
    (code) => parseCode(code)?.seasonNumber === next.seasonNumber,
  ).length;
  const season = view.seasons.find(
    (candidate) => candidate.seasonNumber === next.seasonNumber,
  );
  const seasonTotal = season?.episodeCount ?? 0;
  const seasonFinale =
    seasonTotal > 0 &&
    next.episodeNumber === seasonTotal &&
    inSeason.length === seasonTotal;
  const last = lastWatched(view);
  // Time by the overview's rule (each episode's own runtime), from the
  // season's minutes it sent; another season's aren't known here: nothing
  const sameSeason =
    next.seasonNumber === item.season && item.seasonRuntimes !== undefined;
  const runtimes = sameSeason ? { [item.season]: item.seasonRuntimes } : {};
  const left = inSeason
    .filter((ref) => !isMarked(codeOf(ref)))
    .map((ref) => ({ episode: ref.episodeNumber, season: ref.seasonNumber }));
  return {
    ...item,
    airDate: undefined,
    code: toEpisodeCode(next.seasonNumber, next.episodeNumber),
    episode: next.episodeNumber,
    episodeTitle: undefined,
    isLatest: sameRef(aired.at(-1), next),
    lastWatchedAt: last.at,
    lastWatchedCode: last.code,
    // "Next season TBA" is the show's state on a finale; a new finale keeps it
    nextSeasonTba: seasonFinale && item.nextSeasonTba,
    runtime: sameSeason
      ? episodeMinutes(
          runtimes,
          { episode: next.episodeNumber, season: next.seasonNumber },
          null,
        )
      : null,
    season: next.seasonNumber,
    seasonFinale,
    seasonRuntimes: sameSeason ? item.seasonRuntimes : undefined,
    seasonTotal,
    seasonWatched,
    timeLeftMinutes: sameSeason ? minutesFor(left, runtimes, null) : null,
    toWatch: left.length,
  };
}
