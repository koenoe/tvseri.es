import { episodeCode, shortCode } from '@tvseri.es/schemas';

import type { EpisodeRef } from './types';

/**
 * The marking toast vocabulary: one line, "Marked Season 2 · Just now".
 */

/** "E06–E09" (or one "E06"): a run inside one season */
export const shortCodeRange = (first: number, last: number) =>
  first === last ? shortCode(first) : `${shortCode(first)}–${shortCode(last)}`;

const byPosition = (a: EpisodeRef, b: EpisodeRef) =>
  a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber;

/**
 * A run of episodes in one line, lowest to highest whatever order they come
 * in: "S02E03–E05" inside one season (the E repeats),
 * "S01E04–S02E03" across seasons, one code for one episode (or the same one
 * twice), empty for none.
 */
export function episodeRun(refs: ReadonlyArray<EpisodeRef>): string {
  const sorted = [...refs].sort(byPosition);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) {
    return '';
  }
  if (byPosition(first, last) === 0) {
    return episodeCode(first);
  }
  return first.seasonNumber === last.seasonNumber
    ? `${episodeCode(first)}–${shortCode(last.episodeNumber)}`
    : `${episodeCode(first)}–${episodeCode(last)}`;
}

/**
 * "S03E05 Children": an episode by name. Pass it as the `what` of marking
 * commands and `openPicker`.
 */
export const episodeLabel = (ref: EpisodeRef, title?: string) =>
  title ? `${episodeCode(ref)} ${title}` : episodeCode(ref);

/** "S03E02–S03E05" (or one code): a range, in the page and in toasts. */
export function codeRange(refs: ReadonlyArray<EpisodeRef>): string {
  const first = refs[0];
  const last = refs[refs.length - 1];
  if (!first || !last) {
    return '';
  }
  return refs.length === 1
    ? episodeCode(first)
    : `${episodeCode(first)}–${episodeCode(last)}`;
}

/** "Marked Season 3 · Just now · incl. 1 skipped · unmarked S03E07–S03E08" */
export function markedMessage(
  input: Readonly<{
    what: string;
    when: string;
    /** Skipped episodes the mark included (bulk marks only say so). */
    skipped?: number;
    bulk?: boolean;
    unmarked?: ReadonlyArray<EpisodeRef>;
  }>,
): string {
  const skipped =
    input.skipped && input.bulk ? ` · incl. ${input.skipped} skipped` : '';
  const unmarked = input.unmarked?.length
    ? ` · unmarked ${codeRange(input.unmarked)}`
    : '';
  return `Marked ${input.what} · ${input.when}${skipped}${unmarked}`;
}

/** "Marked S03E05–S03E07 · Just now": merged Just-now marks and mark runs. */
export const runMessage = (refs: ReadonlyArray<EpisodeRef>) =>
  `Marked ${codeRange(refs)} · Just now`;

/** The whole-series scope, mid-sentence ("Marked the whole series · Just now") */
export const WHOLE_SHOW = 'the whole series';

const capitalised = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** "Season 3 unmarked", "The whole show unmarked", "S03E05 Children unmarked" */
export const unmarkedMessage = (what: string) =>
  `${capitalised(what)} unmarked`;

/** "Marked Severance as seen": Seen it / Already seen, no date */
export const seenMessage = (title: string) => `Marked ${title} as seen`;

/** "Unmarked S03E02–S03E04" (an unmark run) */
export const unmarkedRunMessage = (refs: ReadonlyArray<EpisodeRef>) =>
  `Unmarked ${codeRange(refs)}`;

export const skippedMessage = (what: string) => `${capitalised(what)} skipped`;

/** "S03E05 Children no longer skipped": Not watched on skipped episodes only */
export const unskippedMessage = (what: string) =>
  `${capitalised(what)} no longer skipped`;

/** "Mark the one before too" / "Mark the 3 before too" */
export const beforeTooLabel = (count: number) =>
  `Mark the ${count === 1 ? 'one' : count} before too`;

/** "The one before" / "The 3 before": what the follow-up toast calls them. */
export const beforeWhat = (count: number) =>
  `The ${count === 1 ? 'one' : count} before`;

export const neverAskMessage = (title: string) =>
  `Won’t ask again for ${title}`;

export const USE_RELEASE_DATES = 'Use release dates';
/** The toast after Hide (with Undo) */
export const HIDDEN_MESSAGE = 'Hidden from in progress';
/** Watchlist on a show already started: it lives in progress (or Finished) instead */
export const STARTED_MESSAGE = 'You’ve already started this series';
export const SEEN_MESSAGE = 'You’ve already seen this series';
/** "Added Marvel Zombies to your watchlist" / "Removed … from your favourites" */
export const listMessage = (
  title: string,
  list: 'favorites' | 'watchlist',
  added: boolean,
) => {
  const name = list === 'favorites' ? 'favourites' : 'watchlist';
  return added
    ? `Added ${title} to your ${name}`
    : `Removed ${title} from your ${name}`;
};
export const SIGN_IN_MESSAGE = 'Please sign in to use this feature';
export const ERROR_MESSAGE = 'Couldn’t save that. It’s back as it was.';
/** A multi-request write that failed part-way: the saved part stays. */
export const PARTIAL_MESSAGE = 'Saved part of it. The rest is back as it was.';
/** The viewer's marks for a show didn't load: nothing is changed until they do */
export const UNAVAILABLE_MESSAGE =
  'Your progress for this series didn’t load, so nothing was changed.';
