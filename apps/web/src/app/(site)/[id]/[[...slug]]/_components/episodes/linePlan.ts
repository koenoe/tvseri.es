import { type EpisodeRef, shortCode } from '@tvseri.es/schemas';
import { formatDuration, plural } from '@tvseri.es/utils';

import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { shortCodeRange } from '@/lib/marking/copy';
import { codeOf } from '@/lib/marking/progress';

import type { ShowEpisode } from '@/lib/series/seasonEpisodes';

import { type Clock, formatWatchedDay } from './format';
import {
  fallbackRuntime,
  isWatchedMark,
  type MarkedEpisode,
  weightOf,
} from './marks';

/**
 * The season line's geometry and paint plan:
 * one segment per episode, as wide as its runtime; a pointer maps to a
 * segment from the line's box and these weights (computed once per gesture);
 * a drag paints the run from the press to the pointer, and the first segment
 * decides whether it marks or unmarks.
 */

export type LineGeometry = Readonly<{
  /** Each segment's runtime weight. */
  weights: ReadonlyArray<number>;
  /** Running totals: `ends[i]` = sum of weights 0…i. */
  ends: ReadonlyArray<number>;
  total: number;
}>;

/** From the season's episodes only, so marking never recomputes it. */
export function lineGeometry(
  episodes: ReadonlyArray<ShowEpisode>,
): LineGeometry {
  const fallback = fallbackRuntime(episodes);
  const weights = episodes.map((episode) => weightOf(episode, fallback));
  const ends: number[] = [];
  let total = 0;
  for (const weight of weights) {
    total += weight;
    ends.push(total);
  }
  return { ends, total, weights };
}

/**
 * The segment under a point `fraction` (0…1) along the line. Ignores the 2px
 * gaps (they are a few pixels at most), so every point maps to a segment.
 */
export function segmentAt(geometry: LineGeometry, fraction: number): number {
  const { ends, total } = geometry;
  if (ends.length === 0) {
    return -1;
  }
  const target = Math.max(0, Math.min(0.99999, fraction)) * total;
  let low = 0;
  let high = ends.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (target < ends[mid]!) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

/** Where a segment starts, in % of the line (the run label's left edge). */
export function segmentStart(geometry: LineGeometry, index: number): number {
  if (geometry.total <= 0 || index <= 0) {
    return 0;
  }
  return (geometry.ends[index - 1]! / geometry.total) * 100;
}

export type RunDirection = 'mark' | 'unmark';

/** The first segment decides: a watched start unmarks, anything else marks. */
export const directionOf = (item: MarkedEpisode | undefined): RunDirection =>
  item && isWatchedMark(item.mark) ? 'unmark' : 'mark';

export type RunPlan = Readonly<{
  direction: RunDirection;
  /** The aired episodes in the run, in order (what the toast names). */
  span: ReadonlyArray<EpisodeRef>;
  /** The ones that change: open/skipped to mark, watched to unmark. */
  todo: ReadonlyArray<EpisodeRef>;
  /** "Mark E6–E9" / "Unmark E2–E4" / "E6–E9 · already watched" */
  title: string;
  /** "4 episodes · 2h 27m" / "3 episodes" / "" */
  detail: string;
}>;

const short = (refs: ReadonlyArray<EpisodeRef>) => {
  const first = refs[0];
  const last = refs[refs.length - 1];
  if (!first || !last) {
    return '';
  }
  return shortCodeRange(first.episodeNumber, last.episodeNumber);
};

const refOf = (item: MarkedEpisode): EpisodeRef => ({
  episodeNumber: item.episode.episodeNumber,
  seasonNumber: item.episode.seasonNumber,
});

/** The run between two segments (either order), as the label and the commit read it. */
export function planRun(
  episodes: ReadonlyArray<MarkedEpisode>,
  geometry: LineGeometry,
  from: number,
  to: number,
  direction: RunDirection,
): RunPlan {
  const low = Math.max(0, Math.min(from, to));
  const high = Math.min(episodes.length - 1, Math.max(from, to));
  const inRun = episodes
    .slice(low, high + 1)
    .map((item, offset) => ({ index: low + offset, item }))
    .filter(({ item }) => item.mark !== 'unaired');
  const span = inRun.map(({ item }) => refOf(item));
  const open = inRun.filter(({ item }) =>
    direction === 'unmark'
      ? isWatchedMark(item.mark)
      : !isWatchedMark(item.mark),
  );
  const label = short(span);
  if (!open.length) {
    return {
      detail: '',
      direction,
      span,
      title: label
        ? `${label} · ${direction === 'unmark' ? 'nothing to unmark' : 'already watched'}`
        : '',
      todo: [],
    };
  }
  const count = plural(open.length, 'episode');
  const minutes = open.reduce(
    (sum, { index }) => sum + (geometry.weights[index] ?? 0),
    0,
  );
  return {
    detail:
      direction === 'unmark' ? count : `${count} · ${formatDuration(minutes)}`,
    direction,
    span,
    title: `${direction === 'unmark' ? 'Unmark' : 'Mark'} ${label}`,
    todo: open.map(({ item }) => refOf(item)),
  };
}

export type SegmentTip = Readonly<{ title: string; detail: string }>;

/**
 * The hover preview of ONE episode: "E6 · Napkins" + "Mark watched",
 * "Watched Jul 2 · Unmark", "Skipped · Mark watched"; not aired: "S04E07
 * Episode 7" + "Airs Fri Nov 13".
 */
export function segmentTip(item: MarkedEpisode, clock: Clock): SegmentTip {
  const { episode } = item;
  if (item.mark === 'unaired') {
    const date = formatAirWeekdayDate(episode.airDate, clock.now ?? undefined);
    return {
      detail: date ? `Airs ${date}` : 'Not aired yet',
      title: `${codeOf(episode)} ${episode.title}`,
    };
  }
  const title = `${shortCode(episode.episodeNumber)} · ${episode.title}`;
  if (item.mark === 'unknown') {
    return { detail: 'Watched · don’t remember when · Unmark', title };
  }
  if (item.mark === 'watched' && item.record) {
    // The wall's words for the day (`formatWatchedDay`, one rule): the year
    // when it isn't this one, and always before the clock is known
    const day = formatWatchedDay(item.record.watchedAt, clock);
    return { detail: `Watched ${day} · Unmark`, title };
  }
  if (item.mark === 'skipped') {
    return { detail: 'Skipped · Mark watched', title };
  }
  return { detail: 'Mark watched', title };
}
