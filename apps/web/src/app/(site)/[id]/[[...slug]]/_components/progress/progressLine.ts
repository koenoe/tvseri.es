import type { SeriesRuntimes } from '@tvseri.es/schemas';
import {
  formatDuration,
  formatDurationWords,
  minutesFor,
  plural,
} from '@tvseri.es/utils';

import { formatAirWeekdayDate, spokenAirDate } from '@/lib/format/airDate';
import { airedRegularEpisodes, toPercentage } from '@/lib/marking/progress';
import type { SeriesBase, SeriesMarks } from '@/lib/marking/types';

import { episodeMap, isPlainFill, type Run, totalOf } from './progressMap';

/**
 * One fact of the line, the same words at every width; `icon`: drawn with
 * its small line icon (the line with skips).
 */
export type LinePart = Readonly<{
  kind: 'count' | 'watched' | 'skipped' | 'toWatch' | 'left' | 'next';
  text: string;
  icon: boolean;
}>;

/**
 * The show page's progress line (the hero and the history sheet): the bar,
 * a map of the show in episode order (`progressMap`), and the words. Done =
 * watched + skipped, of every regular episode. With no skips it reads
 * as it always has ("60% · 6 of 10 watched · 2h left"); with skips, "76% ·
 * 312 watched · 68 skipped · 46h left". Pure: the client islands feed it
 * the store's view.
 */
export type ProgressLine = Readonly<{
  /** "76%" */
  percent: string;
  parts: ReadonlyArray<LinePart>;
  /** Everything the line says, in words, for the label */
  label: string;
  /** Every regular episode in order, as runs */
  runs: ReadonlyArray<Run>;
  /** Watched in order, no skips: today's single fill (`watched`) */
  plain: boolean;
  /** The plain fill's share, 0–100 */
  watched: number;
  /** The aired share, 0–100 (100 unless a season airs) */
  aired: number;
  /** A season airs: a tick at the aired share, the rest not aired */
  airing: boolean;
}>;

/** Before the store has the show (the history sheet): its announced episodes, nothing aired or watched */
export const unseeded = (
  seasons: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeCount: number }>
  >,
) => ({
  seasons: seasons.map(({ episodeCount, seasonNumber }) => ({
    airedEpisodeCount: 0,
    episodeCount,
    seasonNumber,
  })),
  skipped: [],
  watched: {},
});

/** No runtimes known yet: no time left or in all */
export const NO_RUNTIMES: SeriesRuntimes = {};

/** The next episode's air date, `YYYY-MM-DD`, while one is dated */
export const nextAirDateOf = (
  series: Readonly<{
    nextEpisodeToAir?: Readonly<{ airDate: string }> | null;
  }>,
) => series.nextEpisodeToAir?.airDate || null;

type Options = Readonly<{
  /** Minutes per episode by season number (index = episode number − 1). */
  runtimes: SeriesRuntimes;
  /** `YYYY-MM-DD` of the next episode to air, while it airs. */
  nextAirDate: string | null;
}>;

/**
 * The runtime of some episodes, in minutes, by the one "time left" rule
 * (`minutesFor`: an unknown one is its season's mean; the page has no series
 * average). 0 when one is still unknown: the line then says no time.
 */
function minutesOf(
  episodes: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeNumber: number }>
  >,
  runtimes: SeriesRuntimes,
): number {
  const refs = episodes.map((ref) => ({
    episode: ref.episodeNumber,
    season: ref.seasonNumber,
  }));
  return minutesFor(refs, runtimes, null) ?? 0;
}

/** A fact of the line, with its small icon or plain */
const linePart = (
  kind: LinePart['kind'],
  text: string,
  icon = false,
): LinePart => ({ icon, kind, text });

/**
 * The line's time left: whole hours from 10h up ("124h", so a long show's
 * line fits a phone), hours and minutes under that ("8h 46m"). The line's
 * own rule: `formatDuration` stays exact everywhere else.
 */
const LONG_MINUTES = 10 * 60;
const timeLeftMinutes = (minutes: number) =>
  minutes >= LONG_MINUTES ? Math.round(minutes / 60) * 60 : minutes;

/** "Fri Nov 13" for the line ('' with no date) */
const airDayOf = (options: Options) =>
  formatAirWeekdayDate(options.nextAirDate ?? '');

const countOf = (runs: ReadonlyArray<Run>, state: Run['state']) =>
  runs.reduce((sum, run) => (run.state === state ? sum + run.count : sum), 0);

/**
 * The count facts: "6 of 10 watched" with no skips, "312 watched · 68
 * skipped" (with their icons) with some.
 */
const countParts = (
  watched: number,
  skipped: number,
  total: number,
): ReadonlyArray<LinePart> =>
  skipped > 0
    ? [
        linePart('watched', `${watched} watched`, true),
        linePart('skipped', `${skipped} skipped`, true),
      ]
    : [linePart('count', `${watched} of ${total} watched`)];

/**
 * The line's counts as plain text ("21 of 47 watched", "21 watched · 1
 * skipped"), for the history sheet's show row: the same numbers and words
 * as the line, without the bar or the time left.
 */
export function countsText(series: SeriesMarks): string {
  const { runs, total } = episodeMap(series, { nextAirs: false });
  return countParts(countOf(runs, 'watched'), countOf(runs, 'skipped'), total)
    .map((part) => part.text)
    .join(' · ');
}

export function progressLine(
  series: SeriesMarks,
  options: Options,
): ProgressLine {
  const nextAirDay = airDayOf(options);
  // A season airs only while an announced episode has a date: an undated
  // one is not watchable yet, and the line says nothing about it
  const map = episodeMap(series, { nextAirs: nextAirDay !== '' });
  const { aired, runs, total } = map;
  const isAiring = map.airing;
  const watched = countOf(runs, 'watched');
  const skipped = countOf(runs, 'skipped');
  // Left = aired, neither watched nor skipped (one rule for the page)
  const left = map.open;
  const minutesLeft = minutesOf(left, options.runtimes);
  const percent = `${toPercentage(watched + skipped, total)}%`;
  const withSkips = skipped > 0;

  const counts = countParts(watched, skipped, total);
  const tail = isAiring
    ? [
        left.length > 0 ? linePart('toWatch', `${left.length} to watch`) : null,
        linePart('next', `next ${nextAirDay}`, withSkips),
      ]
    : [
        minutesLeft > 0
          ? linePart(
              'left',
              `${formatDuration(timeLeftMinutes(minutesLeft))} left`,
              withSkips,
            )
          : null,
      ];

  const spokenCounts = withSkips
    ? `${percent} done: ${watched} watched, ${skipped} skipped`
    : `${percent} watched: ${watched} of ${total}`;
  const airDate = spokenAirDate(options.nextAirDate ?? '');
  const spoken = [
    spokenCounts,
    left.length > 0
      ? `${left.length} ${isAiring ? 'to watch' : 'to go'}`
      : null,
    !isAiring && minutesLeft > 0
      ? `${formatDurationWords(timeLeftMinutes(minutesLeft))} left`
      : null,
    isAiring ? `next episode ${airDate}` : null,
  ];

  return {
    aired: isAiring ? (aired / total) * 100 : total > 0 ? 100 : 0,
    airing: isAiring,
    label: spoken.filter(Boolean).join(', '),
    parts: [...counts, ...tail].filter((item) => item !== null),
    percent,
    plain: isPlainFill(runs),
    runs,
    watched: total > 0 ? (watched / total) * 100 : 0,
  };
}

/**
 * Signed out, the line states the series' size in place of a viewer's
 * progress, fact by fact: "47 episodes · 26h 51m in all" (its aired
 * regular episodes and their runtime; just the count when no runtime is
 * known). Before anything airs it counts every episode and, as the
 * signed-in line does, says when the next one is: "8 episodes · next Fri
 * 13 Nov".
 */
export function sizeLine(
  series: Pick<SeriesBase, 'seasons'>,
  options: Options,
): ReadonlyArray<string> {
  const aired = airedRegularEpisodes(series);
  const total = totalOf(series);
  const count = aired.length > 0 ? aired.length : total;
  const episodes = plural(count, 'episode');
  if (aired.length === 0) {
    const nextAirDay = airDayOf(options);
    return nextAirDay ? [episodes, `next ${nextAirDay}`] : [episodes];
  }
  const minutes = minutesOf(aired, options.runtimes);
  return minutes > 0
    ? [episodes, `${formatDuration(minutes)} in all`]
    : [episodes];
}
