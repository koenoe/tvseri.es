/**
 * Class lists the importer repeats (solid buttons, segmented controls, card
 * heads, meta rows); the ones its review items share with other lists live
 * in `_components/problems/styles`. One-off values stay in their component.
 */

/** The importer's solid white action: no edge, 24px either side */
export const SOLID_BUTTON =
  'border-0 px-6 font-medium text-[#171717] has-[>svg:first-child]:pl-6';

/** The segmented control's track and items */
export const SEGMENTED = 'flex gap-0.5 rounded-10 bg-black/28 p-0.75';
export const SEGMENT =
  'h-7.5 cursor-pointer whitespace-nowrap rounded-[7px] px-3 text-body-sm font-medium text-white/60 transition-[background-color,color] hover:text-white aria-pressed:bg-white/16 aria-pressed:text-white aria-selected:bg-white/16 aria-selected:text-white';

/** A card's header row: dot, title, count */
export const CARD_HEAD = 'flex items-center gap-3 max-md:flex-wrap';
export const CARD_TITLE = 'text-body';
export const CARD_COUNT = 'text-meta leading-5 text-white/60';

/** One meta line of 13px items with 13px icons */
export const META_ROW =
  'flex flex-wrap items-center gap-x-4 gap-y-2 text-meta leading-5 max-md:gap-x-3';
export const META_ITEM = 'inline-flex items-center gap-1.5 whitespace-nowrap';
