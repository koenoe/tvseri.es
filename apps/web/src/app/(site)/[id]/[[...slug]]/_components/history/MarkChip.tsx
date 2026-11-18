import { eyeGlyph, skippedGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
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

const arrow = <path d="M5 12h13M13 6l6 6-6 6" />;
const ring = <circle cx="12" cy="12" r="6" />;

/** Every glyph sits in one 11px box, so every chip is the same width */
const GLYPH_BOX =
  'inline-flex size-[11px] shrink-0 items-center justify-center';

/**
 * The chip's quiet second cue, one per state: a ring for not watched (and
 * not aired), the eye for watched (65%) and "I don't remember" (45%), → for
 * Next up, the app's eye-off for skipped (as on the season line).
 */
export function ChipGlyph({
  overlay,
  state,
}: Readonly<{ state: ChipState; overlay?: ChipOverlay }>) {
  const faded = overlay === 'unrun' ? 'opacity-20' : '';
  if (state === 'w' || state === 'nd' || state === 'sk') {
    const classes = cn(
      'size-[11px] shrink-0',
      state === 'nd' ? 'opacity-45' : 'opacity-65',
      faded,
    );
    if (state === 'sk') {
      return <Icon className={classes} glyph={skippedGlyph} size={13} />;
    }
    return <Icon active className={classes} glyph={eyeGlyph} size={13} />;
  }
  const isNext = state === 'nx';
  const quiet = isNext ? '' : 'opacity-45';
  const shape = isNext ? arrow : ring;
  return (
    <span aria-hidden="true" className={GLYPH_BOX}>
      <svg
        className={cn('size-[9px]', quiet)}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        {shape}
      </svg>
    </span>
  );
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
