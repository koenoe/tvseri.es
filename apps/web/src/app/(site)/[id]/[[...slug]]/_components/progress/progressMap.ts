import { airedRegularEpisodes, codeOf } from '@/lib/marking/progress';
import type {
  EpisodeCode,
  EpisodeRef,
  SeriesBase,
  SeriesMarks,
} from '@/lib/marking/types';

/**
 * The progress bar as a map of the show in episode order: watched solid,
 * skipped dashed, still to watch quiet, not aired yet quieter at the end.
 * Episodes → runs (same-state neighbours joined) → runs placed at the
 * bar's real width, where a run under 2px is drawn in its neighbour's
 * state (drawing only: the counts in the line never change). Pure.
 */

export type RunState = 'watched' | 'skipped' | 'open' | 'unaired';

export type Run = Readonly<{ state: RunState; count: number }>;

/** A run as drawn: from and to as percentages of the bar (0–100) */
export type DrawnRun = Readonly<{ state: RunState; from: number; to: number }>;

/** The narrowest run the bar draws in its own state, in px */
const MIN_RUN_PX = 2;

/** Every regular episode, announced or aired */
export const totalOf = (series: Pick<SeriesBase, 'seasons'>) =>
  series.seasons
    .filter((season) => season.seasonNumber > 0)
    .reduce(
      (sum, season) =>
        sum + Math.max(season.episodeCount, season.airedEpisodeCount),
      0,
    );

/** Appends one episode (or `count`) to the runs, joining a same-state neighbour */
function push(runs: Run[], state: RunState, count = 1) {
  const last = runs.at(-1);
  if (last?.state === state) {
    runs[runs.length - 1] = { count: last.count + count, state };
  } else if (count > 0) {
    runs.push({ count, state });
  }
}

/**
 * The show in one pass over its aired regular episodes: the runs (watched
 * wins over skipped), the open episodes (neither watched nor skipped, in
 * order: what is left, `openEpisodes`). A season airs while episodes are still to come and the
 * next has a date (`nextAirs`): those close the bar as not aired;
 * otherwise (no date yet) they draw as still to watch, as the bar always
 * has.
 */
export type EpisodeMap = Readonly<{
  runs: ReadonlyArray<Run>;
  open: ReadonlyArray<EpisodeRef>;
  aired: number;
  total: number;
  airing: boolean;
}>;

export function episodeMap(
  series: SeriesMarks,
  options: Readonly<{ nextAirs: boolean }>,
): EpisodeMap {
  const skipped = new Set<EpisodeCode>(series.skipped);
  const aired = airedRegularEpisodes(series);
  const total = totalOf(series);
  const airing = aired.length < total && options.nextAirs;
  const runs: Run[] = [];
  const open: EpisodeRef[] = [];
  for (const ref of aired) {
    const code = codeOf(ref);
    const state: RunState = series.watched[code]
      ? 'watched'
      : skipped.has(code)
        ? 'skipped'
        : 'open';
    push(runs, state);
    if (state === 'open') {
      open.push(ref);
    }
  }
  push(runs, airing ? 'unaired' : 'open', total - aired.length);
  return { aired: aired.length, airing, open, runs, total };
}

/**
 * Watched in order with no skips: the bar is today's single fill (and its
 * slide), not a map.
 */
export const isPlainFill = (runs: ReadonlyArray<Run>) =>
  runs.every(
    (run, index) =>
      run.state === 'open' ||
      run.state === 'unaired' ||
      (run.state === 'watched' && index === 0),
  );

/**
 * The runs placed on a bar `width` px wide (`null` until measured: every
 * run drawn). A run under 2px takes its left neighbour's drawn state (the
 * first run its right neighbour's), then equal neighbours join.
 */
export function drawRuns(
  runs: ReadonlyArray<Run>,
  width: number | null,
): ReadonlyArray<DrawnRun> {
  const total = runs.reduce((sum, run) => sum + run.count, 0);
  if (total === 0) {
    return [];
  }
  const tooNarrow = (run: Run) =>
    width !== null && (run.count / total) * width < MIN_RUN_PX;
  const drawn: DrawnRun[] = [];
  let at = 0;
  for (const [index, run] of runs.entries()) {
    const from = (at / total) * 100;
    at += run.count;
    const to = (at / total) * 100;
    const left = drawn.at(-1);
    const state = tooNarrow(run)
      ? (left?.state ?? runs[index + 1]?.state ?? run.state)
      : run.state;
    if (left?.state === state) {
      drawn[drawn.length - 1] = { ...left, to };
    } else {
      drawn.push({ from, state, to });
    }
  }
  return drawn;
}
