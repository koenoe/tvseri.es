import type { StatsFinishedShow } from '@tvseri.es/schemas';
import { formatDuration } from '@/lib/format/duration';
import { plural } from '@/lib/format/text';
import { seasonCode } from '@/lib/marking/copy';
import showPath from '@/lib/routing/showPath';
import { monthDay } from '../../_lib/weeks';

/** Tiles shown: the first one wide, the rest narrow */
export const FINISHED_TILES = 6;

/** "S01", "S01–S03" for a run, "S01, S03" otherwise */
export function seasonsLabel(seasons: ReadonlyArray<number>): string {
  const sorted = [...seasons].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (first === undefined || last === undefined) {
    return '';
  }
  if (sorted.length === 1) {
    return seasonCode(first);
  }
  const isRun = last - first === sorted.length - 1;
  return isRun
    ? `${seasonCode(first)}–${seasonCode(last)}`
    : sorted.map(seasonCode).join(', ');
}

export type FinishedTile = Readonly<{
  id: number;
  title: string;
  href: string;
  /** "S01, 15 episodes" */
  episodes: string;
  /** "Finished Apr 11" */
  finished: string;
  /** "13h 45m" */
  duration: string;
}>;

export function finishedTile(
  show: StatsFinishedShow,
  year: number,
): FinishedTile {
  const seasons = seasonsLabel(show.seasons);
  const episodes = plural(show.episodes, 'episode');
  return {
    duration: formatDuration(show.runtimeMinutes),
    episodes: seasons ? `${seasons}, ${episodes}` : episodes,
    finished: `Finished ${monthDay(show.finishedAt, year)}`,
    href: showPath(show.id, show.slug),
    id: show.id,
    title: show.title,
  };
}
