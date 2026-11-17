import { type StatsFinishedShow, seasonCode } from '@tvseri.es/schemas';

import { formatRuntime } from '@tvseri.es/utils';

import type { Fact } from '@/components/ui/accordion/slice';
import { plural } from '@/lib/format/text';
import showPath from '@/lib/routing/showPath';

import { monthDay } from '@/lib/stats/weeks';

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
  /**
   * "S01, 15 episodes"; null when nothing of the show is dated in the year
   * (it reached Finished through an "I don't remember" mark or a special,
   * its episodes dated in earlier years): no "0 episodes"
   */
  episodes: string | null;
  /** "Finished Apr 11" */
  finished: string;
  /** "13h 45m"; null without runtime in the year: no "0m" */
  duration: string | null;
}>;

function episodesLabel(show: StatsFinishedShow): string | null {
  if (show.episodes <= 0) {
    return null;
  }
  const seasons = seasonsLabel(show.seasons);
  const episodes = plural(show.episodes, 'episode');
  return seasons ? `${seasons}, ${episodes}` : episodes;
}

export function finishedTile(
  show: StatsFinishedShow,
  year: number,
): FinishedTile {
  return {
    duration: formatRuntime(show.runtimeMinutes),
    episodes: episodesLabel(show),
    finished: `Finished ${monthDay(show.finishedAt, year)}`,
    href: showPath(show.id, show.slug),
    id: show.id,
    title: show.title,
  };
}

/** The open slice's facts: the episodes and runtime only when there are any */
export function finishedFacts(tile: FinishedTile): ReadonlyArray<Fact> {
  const facts: ReadonlyArray<Fact | null> = [
    tile.episodes ? { kind: 'seasons', text: tile.episodes } : null,
    { kind: 'finished', text: tile.finished },
    tile.duration ? { kind: 'runtime', text: tile.duration } : null,
  ];
  return facts.filter((fact): fact is Fact => fact !== null);
}
