import {
  type Episode,
  episodeCode,
  parseEpisodeCode,
} from '@tvseri.es/schemas';

import type {
  EpisodeCode,
  EpisodeRef,
  EpisodeState,
  SeasonInfo,
  SeriesBase,
} from './types';

/**
 * The watch-progress rules, pure. Specials
 * (season 0) never count for progress, Next up or completion; aired episodes
 * are numbered 1…airedEpisodeCount within a season. Skipped is not
 * watched (progress, complete, the eye), but it is done: never "left", and a
 * show with every aired episode watched or skipped is Finished (the API's
 * list rule, `isFinished`).
 */

const isRegular = (season: SeasonInfo) => season.seasonNumber > 0;

const bySeason = (a: SeasonInfo, b: SeasonInfo) =>
  a.seasonNumber - b.seasonNumber;

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

/** Every aired episode of a season, in order. */
function airedEpisodes(season: SeasonInfo): ReadonlyArray<EpisodeRef> {
  return Array.from({ length: season.airedEpisodeCount }, (_, index) => ({
    episodeNumber: index + 1,
    seasonNumber: season.seasonNumber,
  }));
}

/** Aired regular episodes of the show, in order. */
export function airedRegularEpisodes(
  series: Pick<SeriesBase, 'seasons'>,
): ReadonlyArray<EpisodeRef> {
  return [...series.seasons]
    .filter(isRegular)
    .sort(bySeason)
    .flatMap(airedEpisodes);
}

const codeOf = (ref: EpisodeRef): EpisodeCode => episodeCode(ref);

/**
 * Next up: the first aired regular episode with no mark (neither watched nor
 * skipped): "what you haven't seen comes first", the rule for
 * the whole product (the API's overview uses it too). `null` when every
 * aired episode is marked.
 */
export function nextEpisode(series: SeriesBase): EpisodeRef | null {
  return openEpisodes(series)[0] ?? null;
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
export function openEpisodes(
  series: Pick<SeriesBase, 'seasons' | 'skipped' | 'watched'>,
): ReadonlyArray<EpisodeRef> {
  const isMarked = markedIn(series);
  return airedRegularEpisodes(series).filter((ref) => !isMarked(codeOf(ref)));
}

export type SeasonProgress = Readonly<{
  seasonNumber: number;
  /** Watched or "don't remember", aired episodes only. */
  watched: number;
  aired: number;
  total: number;
  skipped: number;
  /** Every aired episode watched (skipped ones don't count). */
  isComplete: boolean;
}>;

export function seasonProgress(
  series: SeriesBase,
  seasonNumber: number,
): SeasonProgress {
  const season = series.seasons.find(
    (item) => item.seasonNumber === seasonNumber,
  );
  const aired = season ? airedEpisodes(season) : [];
  const skipped = new Set(series.skipped);
  const watched = aired.filter((ref) => series.watched[codeOf(ref)]).length;
  return {
    aired: aired.length,
    isComplete: aired.length > 0 && watched === aired.length,
    seasonNumber,
    skipped: aired.filter((ref) => skipped.has(codeOf(ref))).length,
    total: Math.max(season?.episodeCount ?? 0, aired.length),
    watched,
  };
}

/**
 * A watched share as a whole percent, the one rule for every place that
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
  percentage: number;
  /** Every aired episode watched: the eye unmarks all. */
  isComplete: boolean;
  /**
   * Finished, as the lists have it: something watched and every aired
   * episode watched or skipped.
   */
  isFinished: boolean;
  /** Minutes watched (sum of the records' runtimes). */
  watchedRuntime: number;
}>;

export function seriesProgress(series: SeriesBase): SeriesProgress {
  const aired = airedRegularEpisodes(series);
  const watched = aired.filter((ref) => series.watched[codeOf(ref)]).length;
  const watchedRuntime = Object.values(series.watched).reduce(
    (sum, record) => sum + record.runtime,
    0,
  );
  const left = openEpisodes(series).length;
  return {
    aired: aired.length,
    isComplete: aired.length > 0 && watched === aired.length,
    isFinished: watched > 0 && left === 0,
    left,
    percentage: toPercentage(watched, aired.length),
    toWatch: aired.length - watched,
    watched,
    watchedRuntime,
  };
}

const isRegularCode = (code: string) => !code.startsWith('S00');

/** Regular episodes watched, aired or not (the API's count for the lists) */
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

/** How many episodes of a season have aired, by number (0 for a season it doesn't know). */
export const airedCountIn = (
  series: Pick<SeriesBase, 'seasons'>,
  seasonNumber: number,
): number =>
  series.seasons.find((item) => item.seasonNumber === seasonNumber)
    ?.airedEpisodeCount ?? 0;

/**
 * Has this episode aired? By its own air date (the API's `hasAired`), or by
 * the season's aired count (`airedCountIn`): a full-season drop dates every
 * episode the same day while the count says one.
 */
export const hasEpisodeAired = (
  episode: Readonly<Pick<Episode, 'airDate' | 'episodeNumber' | 'hasAired'>>,
  airedCount: number,
): boolean =>
  episode.episodeNumber <= airedCount ||
  (episode.hasAired && episode.airDate !== '');

/** Aired episodes of a season that aren't watched yet (skipped included). */
export function unwatchedInSeason(
  series: SeriesBase,
  seasonNumber: number,
): ReadonlyArray<EpisodeRef> {
  return airedInSeason(series, seasonNumber).filter(
    (ref) => !series.watched[codeOf(ref)],
  );
}

/**
 * Aired regular episodes of the show that aren't watched yet (skipped
 * included): what the whole-series mark and its date mark.
 */
export function unwatchedRegularEpisodes(
  series: SeriesBase,
): ReadonlyArray<EpisodeRef> {
  return airedRegularEpisodes(series).filter((ref) => !isWatched(series, ref));
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

export { codeOf };
