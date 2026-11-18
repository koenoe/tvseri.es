import { eyeGlyph, skippedGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import type { ChipState } from './chips';

/**
 * The small chip look (overrides): one
 * class list per state so no fill fights another. `extra` is a drag or
 * "I'm up to…" overlay that replaces the state's fill and edge.
 */
export type ChipOverlay =
  /** in a mark run */
  | 'run'
  /** in an unmark run */
  | 'unrun'
  /** "I'm up to…" target */
  | 'target'
  /** will be marked */
  | 'preview'
  /** will be unmarked */
  | 'struck';

const BASE =
  'group/chip inline-flex h-7.5 cursor-pointer select-none items-center justify-center gap-[5px] whitespace-nowrap rounded-[9px] px-[9px] text-caption font-medium tabular-nums transition-[background-color,box-shadow,color] duration-150 [-webkit-touch-callout:none] focus-visible:outline-offset-2';

const STATE: Readonly<Record<ChipState, string>> = {
  '': 'bg-white/6 text-white/60 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] hover:bg-white/11 hover:text-white',
  na: 'pointer-events-none cursor-default bg-white/6 text-white/60 opacity-30 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]',
  nd: 'bg-white/9 text-white/85 outline-[1.5px] outline-white/38 outline-dashed -outline-offset-[1.5px] hover:bg-white/11 hover:text-white',
  nx: 'bg-white/6 text-white shadow-[inset_0_0_0_1.5px_var(--color-cyan)] hover:bg-white/11',
  sk: 'bg-transparent text-white/60 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] hover:bg-white/11 hover:text-white',
  w: 'bg-white/17 text-white hover:bg-white/23',
};

const OVERLAY: Readonly<Record<ChipOverlay, string>> = {
  preview:
    'bg-white/22 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)] outline-0 hover:bg-white/22',
  run: 'bg-white/24 text-white shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.6)] outline-0 hover:bg-white/24',
  struck:
    'bg-transparent text-white/60 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] outline-0 hover:bg-transparent',
  target:
    'bg-white/30 text-white shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-page)_75%,black),0_0_0_4px_white] outline-0 hover:bg-white/30',
  unrun:
    'bg-transparent text-white/60 shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.45)] outline-0 hover:bg-transparent',
};

export function markChipClass(
  state: ChipState,
  overlay?: ChipOverlay,
  className?: string,
): string {
  return cn(BASE, overlay ? OVERLAY[overlay] : STATE[state], className);
}

/** Not watched: a quiet ring */
const ringGlyph: Glyph = { outline: <circle cx="12" cy="12" r="8" /> };

/** Next up's →, drawn as wide as an eye so it weighs the same */
const arrowGlyph: Glyph = {
  outline: <path d="M3.5 12h16M14 6.5l5.5 5.5-5.5 5.5" />,
};

/** Every glyph sits in one 11px box, so every chip is the same width */
const GLYPH_BOX =
  'inline-flex size-[11px] shrink-0 items-center justify-center';

type ChipMark = 'eye' | 'ring' | 'next' | 'skip';

/**
 * What the chip shows: its state, or under a run or the Up to target what
 * it will become (marked: the eye, unmarked: the ring). Skipped
 * stays skipped under a run.
 */
function chipMark(state: ChipState, overlay?: ChipOverlay): ChipMark {
  if (state === 'sk') {
    return 'skip';
  }
  if (overlay === 'run' || overlay === 'preview' || overlay === 'target') {
    return 'eye';
  }
  if (overlay === 'unrun' || overlay === 'struck') {
    return 'ring';
  }
  if (state === 'w' || state === 'nd') {
    return 'eye';
  }
  return state === 'nx' ? 'next' : 'ring';
}

/**
 * The chip's second cue, one per state, as everywhere else in the app: the
 * eye for watched (also "I don't remember"), a ring for not watched, →
 * for Next up (full strength), skip-forward for skipped. One
 * size, one stroke, 65%.
 */
export function ChipGlyph({
  overlay,
  state,
}: Readonly<{ state: ChipState; overlay?: ChipOverlay }>) {
  const mark = chipMark(state, overlay);
  const quiet = mark === 'next' ? undefined : 'opacity-65';
  const classes = cn('shrink-0', quiet);
  if (mark === 'eye') {
    return (
      <Icon
        active
        className={classes}
        glyph={eyeGlyph}
        size={11}
        strokeWidth={2.2}
      />
    );
  }
  const glyph =
    mark === 'next' ? arrowGlyph : mark === 'skip' ? skippedGlyph : ringGlyph;
  return <Icon className={classes} glyph={glyph} size={11} strokeWidth={2.2} />;
}

/** The glyph's box with nothing in it: a placeholder chip's width */
export function ChipGlyphSpace() {
  return <span aria-hidden="true" className={GLYPH_BOX} />;
}

/** The label; struck through when skipped or about to be unmarked. */
export function ChipText({
  children,
  struck,
}: Readonly<{ children: string; struck: boolean }>) {
  return (
    <span className={struck ? 'line-through' : undefined}>{children}</span>
  );
}
