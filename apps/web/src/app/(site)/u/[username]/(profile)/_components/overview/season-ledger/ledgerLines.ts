import { plural } from '@tvseri.es/utils';
import { formatMonthYear } from '@/lib/format/date';

/**
 * The holes a card lists: the card is one
 * show at a time and never taller than three rows, whatever the show's
 * history. The chart above still draws every gap; the rows past these are
 * one "+N more" link to the show's history (`moreHoles`).
 */
export const LEDGER_ROWS = 3;

export type HoleState = 'open' | 'watched' | 'skipped';

export type Hole = Readonly<{ episode: number; state: HoleState }>;

/** A stretch of a season's line, in percent of its width */
export type LineRun = Readonly<{
  left: number;
  tone: 'watched' | 'skipped';
  width: number;
}>;

/**
 * One season as a line: every episode is a step of it,
 * watched ones filled, a hole left as a gap until it is watched (filled)
 * or skipped (a soft stretch). Consecutive steps of one tone are one run.
 */
export function seasonRuns(
  total: number,
  holes: ReadonlyArray<Hole>,
): LineRun[] {
  const steps = Math.max(total, ...holes.map((hole) => hole.episode), 1);
  const state = new Map(holes.map((hole) => [hole.episode, hole.state]));
  const runs: Array<{ start: number; tone: LineRun['tone']; end: number }> = [];
  for (let step = 1; step <= steps; step++) {
    const hole = state.get(step);
    if (hole === 'open') {
      continue;
    }
    const tone = hole === 'skipped' ? 'skipped' : 'watched';
    const last = runs.at(-1);
    if (last && last.end === step - 1 && last.tone === tone) {
      last.end = step;
    } else {
      runs.push({ end: step, start: step - 1, tone });
    }
  }
  return runs.map((run) => ({
    left: (run.start / steps) * 100,
    tone: run.tone,
    width: ((run.end - run.start) / steps) * 100,
  }));
}

/** Up to this many seasons read as one column of lines (two would split 1 2 | 3 4) */
const ONE_COLUMN_MAX = 4;

/** The seasons split over two columns, the first one the longer: 26 is 13 and 13, 5 is 3 and 2 */
export function splitColumns(seasons: number): [number, number] {
  const first = Math.ceil(seasons / 2);
  return [first, seasons - first];
}

/**
 * The chart's columns of season numbers: one column for a
 * short show, two (the first the longer) from five seasons on.
 */
export function chartColumns(seasons: number): number[][] {
  const all = Array.from({ length: Math.max(seasons, 0) }, (_, i) => i + 1);
  if (seasons <= ONE_COLUMN_MAX) {
    return [all];
  }
  const [first] = splitColumns(seasons);
  return [all.slice(0, first), all.slice(first)];
}

/** "3 episodes missing", "1 episode missing", "No gaps left" */
export function missingLabel(open: number): string {
  if (open <= 0) {
    return 'No gaps left';
  }
  return `${plural(open, 'episode')} missing`;
}

/** The holes past the card's rows: how many, and the season to open in the show's history */
export function moreHoles<T extends Readonly<{ season: number }>>(
  episodes: ReadonlyArray<T>,
): Readonly<{ count: number; season: number }> | null {
  const rest = episodes.slice(LEDGER_ROWS);
  const [first] = rest;
  return first ? { count: rest.length, season: first.season } : null;
}

/** "Aired Feb 2005"; the API sends '' when the date is unknown */
export function airedLabel(airDate: string): string {
  return airDate ? `Aired ${formatMonthYear(airDate)}` : 'Air date unknown';
}

/** The chart's label for assistive tech */
export function chartLabel(seasons: number, open: number): string {
  const gaps =
    open === 0
      ? 'no episodes never logged'
      : `${plural(open, 'episode')} never logged`;
  return `${plural(seasons, 'season')}, one line each; ${gaps}`;
}

/** Every show's choices live in one record, so the key names the show too: S01E03 of show A is not S01E03 of show B */
export const holeKey = (seriesId: number, code: string) =>
  `${seriesId}:${code}`;

/** One show's choices by episode code, out of the record of all of them */
export function statesOf(
  seriesId: number,
  codes: ReadonlyArray<string>,
  all: Readonly<Record<string, HoleState>>,
): Record<string, HoleState> {
  return Object.fromEntries(
    codes.map((code) => [code, all[holeKey(seriesId, code)] ?? 'open']),
  );
}

export type LedgerChoice =
  | Readonly<{ kind: 'release' }>
  | Readonly<{ kind: 'skip' }>
  | Readonly<{ kind: 'unmark' }>;

/**
 * What a row's choice asks of the marking core. Watched marks on the
 * release day, Skipped skips, and Undo unmarks, but only a row this lane
 * just marked (`before` is watched or skipped): an open hole never gets an
 * unmark, so nothing the viewer had before is ever taken away.
 */
export function choiceFor(
  before: HoleState,
  next: HoleState,
): LedgerChoice | null {
  if (next === 'watched') {
    return before === 'open' ? { kind: 'release' } : null;
  }
  if (next === 'skipped') {
    return before === 'open' ? { kind: 'skip' } : null;
  }
  return before === 'open' ? null : { kind: 'unmark' };
}

/** Past this many characters "Next: <title>" won't fit beside the title */
const NEXT_TITLE_MAX = 16;

/** "Next: The Chosen"; "Next show" for a long name */
export function nextLabel(title: string): string {
  return title.length > NEXT_TITLE_MAX ? 'Next series' : `Next: ${title}`;
}
