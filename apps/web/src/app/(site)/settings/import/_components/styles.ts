import { FILL_BEFORE } from '@/components/motion/fillBefore';
import { HIT_Y } from '@/components/ui/button/hitArea';

/**
 * Class lists the importer repeats (solid buttons, segmented controls, card
 * heads, meta rows); the ones its review items share with other lists live
 * in `_components/problems/styles`. One-off values stay in their component.
 */

/** The importer's solid white action: no edge, 24px either side */
export const SOLID_BUTTON =
  'border-0 px-6 font-medium text-[#171717] has-[>svg:first-child]:pl-6';

/** The segmented control's track and items (30px, 40px to the pointer) */
export const SEGMENTED = 'flex gap-0.5 rounded-10 bg-black/28 p-0.75';
/** The fill is the choice's ::before, so it glides between choices (`ChoiceButton`) */
export const SEGMENT_BASE = `${FILL_BEFORE} h-7.5 cursor-pointer whitespace-nowrap rounded-[7px] px-3 text-body-sm font-medium text-white/60 transition-colors hover:text-white aria-pressed:text-white aria-pressed:before:bg-white/16 aria-selected:text-white aria-selected:before:bg-white/16`;
export const SEGMENT = `${SEGMENT_BASE} ${HIT_Y[5]}`;

/** A card's header row: dot, title, count */
export const CARD_HEAD = 'flex items-center gap-3 max-md:flex-wrap';
export const CARD_TITLE = 'text-body';
export const CARD_COUNT = 'text-meta leading-5 text-white/60 tabular-nums';

/** One meta line of 13px items with 13px icons */
export const META_ROW =
  'flex flex-wrap items-center gap-x-4 gap-y-2 text-meta leading-5 tabular-nums max-md:gap-x-3';
export const META_ITEM = 'inline-flex items-center gap-1.5 whitespace-nowrap';

/**
 * A part folding in and out of a step (the Columns panel, the unmatched
 * list) takes the step's gap (`gap-6`) with it: it draws the gap inside
 * itself and takes the column's back, so nothing jumps once it has gone
 */
export const STEP_FOLD = '-mt-6';
export const STEP_FOLD_GAP = 'pt-6';
