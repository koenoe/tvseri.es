import { shortCode } from '@tvseri.es/schemas';
import { episodeNumbersOf, firstEpisodeOf } from '@tvseri.es/utils';

import { episodeState, parseCode } from '@/lib/marking/progress';
import type { EpisodeRef, SeriesBase } from '@/lib/marking/types';

/**
 * The episode chip states: not watched (''), watched (`w`),
 * "I don't remember" (`nd`), Next up (`nx`), skipped (`sk`) and not aired yet
 * (`na`, drawn disabled).
 */
export type ChipState = '' | 'w' | 'nd' | 'nx' | 'sk' | 'na';

export type SheetChip = Readonly<{ ref: EpisodeRef; state: ChipState }>;

/** A season's or the show's state: complete, partly watched or not started. */
export type SetState = 'w' | 'part' | '';

export const isWatchedChip = (state: ChipState) =>
  state === 'w' || state === 'nd';

/** Watched and "I don't remember" chips are pressed (`aria-pressed`). */
export const isPressedChip = isWatchedChip;

const sameRef = (a: EpisodeRef | null, b: EpisodeRef) =>
  a !== null &&
  a.seasonNumber === b.seasonNumber &&
  a.episodeNumber === b.episodeNumber;

/** One episode's chip state; `next` is the show's Next up. */
function chipState(
  view: SeriesBase,
  ref: EpisodeRef,
  next: EpisodeRef | null,
  lastAired: number,
): ChipState {
  const state = episodeState(view, ref);
  if (state === 'watched') {
    return 'w';
  }
  if (state === 'unknown') {
    return 'nd';
  }
  if (state === 'skipped') {
    return 'sk';
  }
  if (ref.episodeNumber > lastAired) {
    return 'na';
  }
  return sameRef(next, ref) ? 'nx' : '';
}

/**
 * Every episode of a season as a chip, in order, from its first real number
 * (TMDB numbers some shows on across seasons): the announced count, or more
 * when the aired count or a watched record past the end says so. A record
 * below the first number (a made-up code) draws no chip.
 */
export function seasonChips(
  view: SeriesBase,
  seasonNumber: number,
  next: EpisodeRef | null,
): ReadonlyArray<SheetChip> {
  const season = view.seasons.find(
    (item) => item.seasonNumber === seasonNumber,
  );
  const first = firstEpisodeOf(season ?? {});
  const aired = season?.airedEpisodeCount ?? 0;
  const recorded = Object.keys(view.watched)
    .map(parseCode)
    .filter((ref) => ref?.seasonNumber === seasonNumber)
    .reduce((max, ref) => Math.max(max, ref?.episodeNumber ?? 0), 0);
  const count = Math.max(
    season?.episodeCount ?? 0,
    aired,
    recorded - first + 1,
  );
  const lastAired = first + aired - 1;
  return episodeNumbersOf(season ?? {}, count).map((episodeNumber) => {
    const ref = { episodeNumber, seasonNumber };
    return { ref, state: chipState(view, ref, next, lastAired) };
  });
}

export type Tally = Readonly<{
  /** Watched (any date) among the aired episodes. */
  watched: number;
  /** Aired episodes (skipped included: they count as not watched). */
  aired: number;
  state: SetState;
  /** Watched share of the aired episodes, 0–100. */
  percentage: number;
}>;

/** "9 of 10": a season's (or the show's) progress over its aired episodes. */
export function tally(chips: ReadonlyArray<SheetChip>): Tally {
  const aired = chips.filter((chip) => chip.state !== 'na');
  const watched = aired.filter((chip) => isWatchedChip(chip.state)).length;
  const state: SetState =
    aired.length > 0 && watched === aired.length ? 'w' : watched ? 'part' : '';
  return {
    aired: aired.length,
    percentage: aired.length ? Math.round((watched / aired.length) * 100) : 0,
    state,
    watched,
  };
}

/** The aired episodes among `chips` (what a season's date applies to). */
export const airedRefs = (chips: ReadonlyArray<SheetChip>) =>
  chips.filter((chip) => chip.state !== 'na').map((chip) => chip.ref);

/** "E05": the chip's label. */
export const chipLabel = (ref: EpisodeRef) => shortCode(ref.episodeNumber);
