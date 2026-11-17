import { formatDuration } from '@tvseri.es/utils';

import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { plural } from '@/lib/format/text';
import { codeOf, openEpisodes, toPercentage } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';

/**
 * The hero's progress line: a 4px bar of the whole show,
 * white = watched; while it airs, a soft run over aired-but-unwatched and a
 * tick where airing stops. Pure: the client island feeds it the store's view.
 */
export type ProgressLine = Readonly<{
  /** "44%" */
  percent: string;
  /** "21 of 47" (the label adds " watched" on desktop) */
  count: string;
  /** "15h left", "24 to watch · next Fri 13 Nov", or '' */
  tail: string;
  /** Bar widths as fractions of the whole show (0–1). */
  watched: number;
  aired: number;
  /** The tick at the aired fraction, while a season airs. */
  airing: boolean;
}>;

/** The runtime of some episodes, in minutes (0 for an unknown one). */
export function minutesOf(
  episodes: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeNumber: number }>
  >,
  runtimes: Readonly<Record<number, ReadonlyArray<number>>>,
): number {
  return episodes.reduce(
    (sum, ref) =>
      sum + (runtimes[ref.seasonNumber]?.[ref.episodeNumber - 1] ?? 0),
    0,
  );
}

export function progressLine(
  series: Pick<SeriesBase, 'seasons' | 'skipped' | 'watched'>,
  options: Readonly<{
    /** Minutes per episode by season number (index = episode number − 1). */
    runtimes: Readonly<Record<number, ReadonlyArray<number>>>;
    /** "Fri 13 Nov": the next episode's air day, while it airs. */
    nextAirDay: string | null;
  }>,
): ProgressLine {
  let total = 0;
  let aired = 0;
  let watched = 0;
  for (const season of series.seasons) {
    if (season.seasonNumber === 0) {
      continue;
    }
    total += Math.max(season.episodeCount, season.airedEpisodeCount);
    aired += season.airedEpisodeCount;
    for (let number = 1; number <= season.airedEpisodeCount; number++) {
      const ref = { episodeNumber: number, seasonNumber: season.seasonNumber };
      if (series.watched[codeOf(ref)]) {
        watched++;
      }
    }
  }
  // Left = aired, neither watched nor skipped (one rule for the page)
  const left = openEpisodes(series);
  const minutesLeft = minutesOf(left, options.runtimes);
  // A season airs only while an announced episode has a date: an undated
  // one is not watchable yet, and the line says nothing about it
  const isAiring = aired < total && options.nextAirDay !== null;
  const toWatch = left.length;
  const tail = isAiring
    ? [toWatch > 0 ? `${toWatch} to watch` : '', `next ${options.nextAirDay}`]
        .filter(Boolean)
        .join(' · ')
    : minutesLeft > 0
      ? `${formatDuration(minutesLeft)} left`
      : '';
  return {
    aired: isAiring ? aired / total : total > 0 ? 1 : 0,
    airing: isAiring,
    count: `${watched} of ${total}`,
    percent: `${toPercentage(watched, total)}%`,
    tail,
    watched: total > 0 ? watched / total : 0,
  };
}

/**
 * Signed out, the line states the series' size in place of a viewer's
 * progress: "47 episodes · 26h 51m in all" (its aired regular episodes and
 * their runtime; just the count when no runtime is known). Before anything
 * airs it counts every episode and, as the signed-in line does, says when
 * the next one is: "8 episodes · next Fri 13 Nov".
 */
export function sizeLine(
  series: Pick<SeriesBase, 'seasons'>,
  options: Readonly<{
    runtimes: Readonly<Record<number, ReadonlyArray<number>>>;
    nextAirDay: string | null;
  }>,
): string {
  const aired: Array<{ episodeNumber: number; seasonNumber: number }> = [];
  let total = 0;
  for (const season of series.seasons) {
    if (season.seasonNumber === 0) {
      continue;
    }
    total += Math.max(season.episodeCount, season.airedEpisodeCount);
    for (let number = 1; number <= season.airedEpisodeCount; number++) {
      aired.push({ episodeNumber: number, seasonNumber: season.seasonNumber });
    }
  }
  const count = aired.length > 0 ? aired.length : total;
  const episodes = plural(count, 'episode');
  if (aired.length === 0) {
    return options.nextAirDay
      ? `${episodes} · next ${options.nextAirDay}`
      : episodes;
  }
  const minutes = minutesOf(aired, options.runtimes);
  return minutes > 0
    ? `${episodes} · ${formatDuration(minutes)} in all`
    : episodes;
}

/** "Fri 13 Nov" from an ISO air date (a calendar day, read in UTC); the year only when it is not this one. */
export function formatAirDay(airDate: string, now?: number): string | null {
  return formatAirWeekdayDate(airDate, now) || null;
}
