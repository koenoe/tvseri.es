import { formatDuration, plural } from '@tvseri.es/utils';

import { codeRange, shortCodeRange } from '@/lib/marking/copy';
import type { EpisodeRef } from '@/lib/marking/types';

import { isWatchedChip, type SheetChip } from './chips';

/**
 * The chips' paint model: a drag paints a consecutive run within one season and the mode pill
 * decides what its release does. Pure, so every rule is unit-tested.
 */
export type SheetMode = 'mark' | 'upto' | 'date';

export type RunDirection = 'mark' | 'unmark';

/** A run: chip indices within one season, as pressed (`from`) and now (`to`). */
export type Run = Readonly<{
  from: number;
  to: number;
  direction: RunDirection;
}>;

/** The first chip decides: a watched start unmarks, anything else marks. */
export function runDirection(mode: SheetMode, start: SheetChip): RunDirection {
  return mode !== 'upto' && isWatchedChip(start.state) ? 'unmark' : 'mark';
}

/** The painted span: press → pointer, or season start → pointer (Up to here). */
export function runSpan(
  mode: SheetMode,
  run: Pick<Run, 'from' | 'to'>,
): readonly [number, number] {
  if (mode === 'upto') {
    return [0, run.to];
  }
  return run.from <= run.to ? [run.from, run.to] : [run.to, run.from];
}

/** Aired chips inside the span (a run never touches not-aired episodes). */
function runChips(
  chips: ReadonlyArray<SheetChip>,
  mode: SheetMode,
  run: Pick<Run, 'from' | 'to'>,
): ReadonlyArray<SheetChip> {
  const [start, end] = runSpan(mode, run);
  return chips.slice(start, end + 1).filter((chip) => chip.state !== 'na');
}

/**
 * Up to here leaves skipped episodes skipped, as "Mark the N before too?"
 * and the Up to dialog (`upToPlan`) do: they are neither marked nor sent.
 */
const keptByUpTo = (mode: SheetMode, chip: SheetChip) =>
  mode !== 'upto' || chip.state !== 'sk';

/** What the release would change (the label's count and the commit). */
function runTodo(
  chips: ReadonlyArray<SheetChip>,
  mode: SheetMode,
  run: Run,
): ReadonlyArray<SheetChip> {
  const inRun = runChips(chips, mode, run).filter((chip) =>
    keptByUpTo(mode, chip),
  );
  const unmark = run.direction === 'unmark';
  if (mode === 'date') {
    return unmark ? inRun.filter((chip) => isWatchedChip(chip.state)) : inRun;
  }
  return inRun.filter((chip) =>
    unmark ? isWatchedChip(chip.state) : !isWatchedChip(chip.state),
  );
}

/** "E6" or "E6–E9": the run's name in the label. */
const spanLabel = (inRun: ReadonlyArray<SheetChip>) => {
  const first = inRun[0]?.ref.episodeNumber;
  const last = inRun[inRun.length - 1]?.ref.episodeNumber;
  return shortCodeRange(first ?? 0, last ?? 0);
};

export type RunPreview = Readonly<{ title: string; detail: string }>;

/**
 * The live label under the grid while dragging: "Mark E6–E9" · "4 episodes ·
 * 2h 27m", "Unmark E2–E4" · "3 episodes", "Date E6–E9" · "4 episodes", or
 * "E6–E9 · already watched". `minutesOf` gives an episode's runtime.
 */
export function runPreview(
  chips: ReadonlyArray<SheetChip>,
  mode: SheetMode,
  run: Run,
  minutesOf: (ref: EpisodeRef) => number,
): RunPreview | null {
  const inRun = runChips(chips, mode, run);
  if (inRun.length === 0) {
    return null;
  }
  const todo = runTodo(chips, mode, run);
  const unmark = run.direction === 'unmark' && mode !== 'upto';
  const label = spanLabel(inRun);
  if (todo.length === 0) {
    return {
      detail: '',
      title: `${label} · ${unmark ? 'nothing to unmark' : 'already watched'}`,
    };
  }
  const verb = mode === 'date' ? 'Date' : unmark ? 'Unmark' : 'Mark';
  const minutes = todo.reduce((sum, chip) => sum + minutesOf(chip.ref), 0);
  const count =
    unmark || mode === 'date'
      ? plural(todo.length, 'episode')
      : `${plural(todo.length, 'episode')} · ${formatDuration(minutes)}`;
  return {
    detail: mode === 'upto' ? `${count} · up to here` : count,
    title: `${verb} ${label}`,
  };
}

export type RunCommit = Readonly<
  | { kind: 'none' }
  | {
      kind: 'paint';
      /**
       * All of the run (`paintRun` sends only what changes and names the
       * whole run in the toast: "Marked S03E06–S03E09 · Just now").
       */
      refs: ReadonlyArray<EpisodeRef>;
      direction: RunDirection;
    }
  | { kind: 'picker'; refs: ReadonlyArray<EpisodeRef>; what: string }
>;

/**
 * What the release does: Tap marks and Up to here paint (only what changes is
 * sent); Tap sets a date opens one picker for the run (a watched start
 * re-dates the watched ones).
 */
export function runCommit(
  chips: ReadonlyArray<SheetChip>,
  mode: SheetMode,
  run: Run,
): RunCommit {
  const inRun = runChips(chips, mode, run);
  if (inRun.length === 0) {
    return { kind: 'none' };
  }
  const span = inRun
    .filter((chip) => keptByUpTo(mode, chip))
    .map((chip) => chip.ref);
  const todo = runTodo(chips, mode, run).map((chip) => chip.ref);
  if (mode === 'date') {
    return {
      kind: 'picker',
      refs: todo.length > 0 ? todo : span,
      what: codeRange(span),
    };
  }
  if (todo.length === 0) {
    return { kind: 'none' };
  }
  return {
    direction: mode === 'upto' ? 'mark' : run.direction,
    kind: 'paint',
    refs: span,
  };
}

/** A chip's box relative to its grid, measured once when a drag starts. */
export type ChipBox = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

/**
 * The chip under a grid-relative point, or `null` in a gap or outside (the
 * run then keeps its last chip). No layout reads: boxes are precomputed.
 */
export function hitChip(
  boxes: ReadonlyArray<ChipBox>,
  x: number,
  y: number,
): number | null {
  const index = boxes.findIndex(
    (box) =>
      x >= box.x &&
      x < box.x + box.width &&
      y >= box.y &&
      y < box.y + box.height,
  );
  return index === -1 ? null : index;
}
