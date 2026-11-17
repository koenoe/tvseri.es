import type { EpisodeRef } from '@tvseri.es/schemas';

import { airedCountIn, codeOf, hasEpisodeAired } from '@/lib/marking/progress';
import type { SeriesBase, WatchRecord } from '@/lib/marking/types';

import type { ShowEpisode } from '@/lib/series/seasonEpisodes';

/**
 * One episode's state as the wall, the season line and the facts draw it:
 * not aired (and not watched), skipped, watched
 * without a date, watched, Next up, or open.
 */
export type EpisodeMark =
  | 'unaired'
  | 'skipped'
  | 'unknown'
  | 'watched'
  | 'next'
  | 'open';

export type MarkedEpisode = Readonly<{
  episode: ShowEpisode;
  mark: EpisodeMark;
  /** The watched record (date, no-date flag) when watched. */
  record: WatchRecord | undefined;
}>;

export const isWatchedMark = (mark: EpisodeMark) =>
  mark === 'watched' || mark === 'unknown';

/** Marks every episode of a season from the live view and Next up. */
export function markEpisodes(
  view: SeriesBase,
  seasonNumber: number,
  episodes: ReadonlyArray<ShowEpisode>,
  nextUp: EpisodeRef | null,
): ReadonlyArray<MarkedEpisode> {
  const aired = airedCountIn(view, seasonNumber);
  const skipped = new Set(view.skipped);
  return episodes.map((episode) => {
    const code = codeOf(episode);
    const record = view.watched[code];
    let mark: EpisodeMark;
    if (!record && !hasEpisodeAired(episode, aired)) {
      mark = 'unaired';
    } else if (skipped.has(code) && !record) {
      mark = 'skipped';
    } else if (record) {
      mark = record.dateUnknown ? 'unknown' : 'watched';
    } else if (
      nextUp?.seasonNumber === episode.seasonNumber &&
      nextUp.episodeNumber === episode.episodeNumber
    ) {
      mark = 'next';
    } else {
      mark = 'open';
    }
    return { episode, mark, record };
  });
}

/** An episode's runtime for sums and widths (the API sends 0 when unknown). */
function runtimeOf(
  episode: Pick<ShowEpisode, 'runtime'>,
  fallback: number,
): number {
  return episode.runtime > 0 ? episode.runtime : fallback;
}

/** The minutes of these episodes, an unknown runtime counted as `fallback`. */
export const runtimeTotal = (
  items: ReadonlyArray<Pick<MarkedEpisode, 'episode'>>,
  fallback: number,
): number =>
  items.reduce((sum, item) => sum + runtimeOf(item.episode, fallback), 0);

/**
 * The season's typical runtime: the mean of the known ones, else 0. With no
 * runtime known nothing is invented ("30m" for runtimes of 0): sums
 * are 0 and drop their time, widths fall back to equal (`weightOf`).
 */
export function fallbackRuntime(
  episodes: ReadonlyArray<Pick<ShowEpisode, 'runtime'>>,
): number {
  const known = episodes.filter((episode) => episode.runtime > 0);
  return known.length
    ? Math.round(
        known.reduce((sum, episode) => sum + episode.runtime, 0) / known.length,
      )
    : 0;
}

/** A segment's width weight: its runtime, equal (1) when none is known. */
export const weightOf = (
  episode: Pick<ShowEpisode, 'runtime'>,
  fallback: number,
): number => runtimeOf(episode, fallback) || 1;
