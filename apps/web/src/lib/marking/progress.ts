import {
  type Episode,
  episodeCode,
  parseEpisodeCode,
} from '@tvseri.es/schemas';
import {
  episodeNumbersOf,
  firstEpisodeOf,
  hasAiredAt,
  isDone,
  type ShowProgress,
  seasonCounts,
  showProgress,
} from '@tvseri.es/utils';

import type {
  EpisodeCode,
  EpisodeRef,
  EpisodeState,
  SeasonInfo,
  SeriesBase,
  SeriesMarks,
} from './types';

/**
 * The watch-progress rules, pure: the store's view read through the shared
 * definition (`showProgress`, the API's too). Specials (season 0) never
 * count for progress, Next up or completion; a season's aired episodes are
 * its first `airedEpisodeCount`, numbered from its `firstEpisodeNumber` (1
 * unless TMDB numbers the show on across seasons). Skipped is not watched
 * (progress, complete), but it is done: never "left", and a started show
 * with no aired episode open is Finished (the API's list rule).
 */

const NO_MARKS: ReadonlyArray<string> = [];

/** The views are immutable snapshots: each is read once */
const progressCache = new WeakMap<object, ShowProgress>();

const toProgressSeason = (season: SeasonInfo) => ({
  airedCount: season.airedEpisodeCount,
  firstEpisodeNumber: season.firstEpisodeNumber,
  seasonNumber: season.seasonNumber,
});

/** The view's progress by the shared rule (`showProgress`) */
function progressOf(series: SeriesMarks): ShowProgress {
  const cached = progressCache.get(series);
  if (cached) {
    return cached;
  }
  const progress = showProgress({
    seasons: series.seasons.map(toProgressSeason),
    skipped: series.skipped,
    watched: Object.keys(series.watched),
  });
  progressCache.set(series, progress);
  return progress;
}

export function episodeState(
  series: SeriesBase,
  ref: EpisodeRef,
): EpisodeState {
  const code = episodeCode(ref);
  const record = series.watched[code];
  if (record) {
    return record.dateUnknown ? 'unknown' : 'watched';
  }
  return series.skipped.includes(code) ? 'skipped' : 'none';
}

export const isWatchedState = (state: EpisodeState) =>
  state === 'watched' || state === 'unknown';

/** Watched, with or without a date (`episodeState` is `watched` or `unknown`) */
export const isWatched = (series: SeriesBase, ref: EpisodeRef): boolean =>
  isWatchedState(episodeState(series, ref));

/** Every aired episode of a season, in order (specials too). */
function airedEpisodes(season: SeasonInfo): ReadonlyArray<EpisodeRef> {
  return episodeNumbersOf(season, season.airedEpisodeCount).map(
    (episodeNumber) => ({ episodeNumber, seasonNumber: season.seasonNumber }),
  );
}

/** Aired regular episodes of the show, in order. */
export function airedRegularEpisodes(
  series: Pick<SeriesBase, 'seasons'>,
): ReadonlyArray<EpisodeRef> {
  return showProgress({
    seasons: series.seasons.map(toProgressSeason),
    skipped: NO_MARKS,
    watched: NO_MARKS,
  }).aired;
}

const codeOf = (ref: EpisodeRef): EpisodeCode => episodeCode(ref);

/**
 * Next up: the first aired regular episode with no mark (neither watched nor
 * skipped): "what you haven't seen comes first", the rule for
 * the whole product (the API's overview uses it too). `null` when every
 * aired episode is marked.
 */
export function nextEpisode(series: SeriesMarks): EpisodeRef | null {
  return progressOf(series).nextUp;
}

/**
 * "Has this episode a mark?" for one show: watched (with or without a date)
 * or skipped, so done either way. Build it once per view, ask it per code.
 */
export function markedIn(
  series: Pick<SeriesBase, 'skipped' | 'watched'>,
): (code: string) => boolean {
  const skipped = new Set<string>(series.skipped);
  return (code) =>
    Boolean(series.watched[code as EpisodeCode]) || skipped.has(code);
}

/**
 * What's left of the show: the aired regular episodes with no mark (neither
 * watched nor skipped), in order. Every "left" and "to watch" on the show
 * page counts these.
 */
export function openEpisodes(series: SeriesMarks): ReadonlyArray<EpisodeRef> {
  return progressOf(series).open;
}

export type SeasonProgress = Readonly<{
  seasonNumber: number;
  /** Watched or "don't remember", aired episodes only. */
  watched: number;
  aired: number;
  total: number;
  skipped: number;
  /** One watched and no aired episode open, skips included (`isDone`) */
  isDone: boolean;
}>;

export function seasonProgress(
  series: SeriesBase,
  seasonNumber: number,
): SeasonProgress {
  const season = series.seasons.find(
    (item) => item.seasonNumber === seasonNumber,
  );
  // Any season by the shared rule, specials included (their own header)
  const counts = season
    ? seasonCounts(toProgressSeason(season), {
        skipped: series.skipped,
        watched: Object.keys(series.watched),
      })
    : NO_COUNTS;
  return {
    aired: counts.aired,
    isDone: isDone(counts),
    seasonNumber,
    skipped: counts.skipped,
    total: Math.max(season?.episodeCount ?? 0, counts.aired),
    watched: counts.watched,
  };
}

const NO_COUNTS = {
  aired: 0,
  done: 0,
  open: 0,
  skipped: 0,
  watched: 0,
} as const;

/**
 * A regular season's counts by the shared rule (none for a season the show
 * doesn't list): watched and done count its aired episodes only, so a record
 * outside them (a made-up code below the first number on a show TMDB numbers
 * on across seasons, an episode yet to air) doesn't count.
 */
export const seasonCountsOf = (series: SeriesMarks, seasonNumber: number) =>
  progressOf(series).seasons.find(
    (season) => season.seasonNumber === seasonNumber,
  ) ?? NO_COUNTS;

/**
 * A watched (or done) share as a whole percent, the one rule for every place that
 * prints it: rounded down, but 1 once anything is watched; 0 only when
 * nothing is and 100 only when everything is.
 */
export function toPercentage(value: number, total: number): number {
  if (total <= 0 || value <= 0) {
    return 0;
  }
  if (value >= total) {
    return 100;
  }
  // `value * 100` first keeps whole shares exact (0.57 * 100 is 56.99…)
  return Math.max(1, Math.floor((value * 100) / total));
}

export type SeriesProgress = Readonly<{
  watched: number;
  aired: number;
  /** Aired, not watched (skipped included). */
  toWatch: number;
  /** Aired, neither watched nor skipped (`openEpisodes`): "24 to watch". */
  left: number;
  /** Aired and watched or skipped: what every fill draws. */
  done: number;
  /** Every aired episode watched (skipped ones don't count). */
  isComplete: boolean;
  /**
   * Finished, as the lists have it: started and no aired episode open
   * (neither watched nor skipped). The show's eye shows it as done.
   */
  isFinished: boolean;
  /** Any regular episode watched, aired or not: the lists' "started". */
  started: boolean;
  /** Minutes watched (sum of the records' runtimes). */
  watchedRuntime: number;
}>;

export function seriesProgress(series: SeriesBase): SeriesProgress {
  const progress = progressOf(series);
  const watchedRuntime = Object.values(series.watched).reduce(
    (sum, record) => sum + record.runtime,
    0,
  );
  return {
    aired: progress.aired.length,
    done: progress.done,
    isComplete: progress.isComplete,
    isFinished: progress.isFinished,
    left: progress.open.length,
    started: progress.started,
    toWatch: progress.aired.length - progress.watched,
    watched: progress.watched,
    watchedRuntime,
  };
}

/** Any regular episode watched, aired or not (the lists' "started") */
export const isStarted = (series: SeriesMarks) => progressOf(series).started;

const isRegularCode = (code: string) => !code.startsWith('S00');

/** Regular episodes watched, aired or not (the profile's counters) */
export const regularWatchedCount = (series: Pick<SeriesBase, 'watched'>) =>
  Object.keys(series.watched).filter(isRegularCode).length;

/**
 * Has the viewer tracked anything of the series itself (a regular episode
 * watched or skipped)? Specials alone don't count, as the lists and the
 * library hint don't count them.
 */
export const hasHistory = (series: Pick<SeriesBase, 'skipped' | 'watched'>) =>
  Object.keys(series.watched).some(isRegularCode) ||
  series.skipped.some(isRegularCode);

/**
 * "Mark the N before too?": the aired, unwatched, unskipped episodes of the
 * same season before `ref` (empty when the prompt shouldn't show).
 */
export function openBefore(
  series: SeriesBase,
  ref: EpisodeRef,
): ReadonlyArray<EpisodeRef> {
  const season = series.seasons.find(
    (item) => item.seasonNumber === ref.seasonNumber,
  );
  if (!season || ref.seasonNumber === 0) {
    return [];
  }
  const skipped = new Set(series.skipped);
  return airedEpisodes(season).filter(
    (item) =>
      item.episodeNumber < ref.episodeNumber &&
      !series.watched[codeOf(item)] &&
      !skipped.has(codeOf(item)),
  );
}

/** Every aired episode of a season, in order (none for a season it doesn't know). */
export function airedInSeason(
  series: Pick<SeriesBase, 'seasons'>,
  seasonNumber: number,
): ReadonlyArray<EpisodeRef> {
  const season = series.seasons.find(
    (item) => item.seasonNumber === seasonNumber,
  );
  return season ? airedEpisodes(season) : [];
}

/**
 * The number of a season's last aired episode (0 for a season it doesn't
 * know; one before its first when none has aired).
 */
export function lastAiredIn(
  series: Pick<SeriesBase, 'seasons'>,
  seasonNumber: number,
): number {
  const season = series.seasons.find(
    (item) => item.seasonNumber === seasonNumber,
  );
  return season ? firstEpisodeOf(season) + season.airedEpisodeCount - 1 : 0;
}

/**
 * Has this episode aired? By the season's aired count (`lastAiredIn`), or by
 * its own air date: a full-season drop dates every episode the same day
 * while the count says one. The date by the one air-day rule (`hasAiredAt`,
 * from the start of the UTC day): live with `now`, else as the API's flag
 * had it when it read the season (rendering stays pure).
 */
export const hasEpisodeAired = (
  episode: Readonly<Pick<Episode, 'airDate' | 'episodeNumber' | 'hasAired'>>,
  lastAired: number,
  now?: number,
): boolean =>
  episode.episodeNumber <= lastAired ||
  (now === undefined
    ? episode.hasAired && episode.airDate !== ''
    : hasAiredAt(episode.airDate, now));

/**
 * A season's aired episodes with no mark (neither watched nor skipped), in
 * order: what its eye and its date mark. Specials too (their own section).
 */
export function openInSeason(
  series: SeriesBase,
  seasonNumber: number,
): ReadonlyArray<EpisodeRef> {
  const isMarked = markedIn(series);
  return airedInSeason(series, seasonNumber).filter(
    (ref) => !isMarked(codeOf(ref)),
  );
}

/** Watched episodes of a season (any record, aired or not). */
export function watchedInSeason(
  series: SeriesBase,
  seasonNumber: number,
): ReadonlyArray<EpisodeRef> {
  return Object.keys(series.watched)
    .map(parseCode)
    .filter((ref): ref is EpisodeRef => ref?.seasonNumber === seasonNumber)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export const parseCode = (code: string): EpisodeRef | null =>
  parseEpisodeCode(code);

/**
 * "I'm up to…": every open aired episode up to the target is marked (earlier
 * seasons included; skipped ones stay skipped, as "Mark the N before too?"
 * leaves them); the watched ones after it in the target's season are
 * unmarked. The dialog's hint and `markUpTo` both use it, so what the hint
 * promises is what gets sent.
 */
export type UpToPlan = Readonly<{
  mark: ReadonlyArray<EpisodeRef>;
  unmark: ReadonlyArray<EpisodeRef>;
}>;

export function upToPlan(view: SeriesBase, target: EpisodeRef): UpToPlan {
  const all = airedRegularEpisodes(view);
  const index = all.findIndex((ref) => codeOf(ref) === codeOf(target));
  const isMarked = markedIn(view);
  return {
    mark: all.slice(0, index + 1).filter((ref) => !isMarked(codeOf(ref))),
    unmark: watchedInSeason(view, target.seasonNumber).filter(
      (ref) => ref.episodeNumber > target.episodeNumber,
    ),
  };
}

export { codeOf };
