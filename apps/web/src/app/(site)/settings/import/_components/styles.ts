/**
 * Class lists the importer repeats (links, small buttons,
 * chips, segmented controls). One-off values stay in
 * their component.
 */

/** Text action: white/80, underlined on hover */
export const LINK =
  'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-body-sm font-medium text-white/80 underline-offset-3 transition-[background-color,color] hover:text-white hover:underline';

/** The importer's solid white action: no edge, 24px either side */
export const SOLID_BUTTON =
  'border-0 px-6 font-medium text-[#171717] has-[>svg:first-child]:pl-6';

/** 32px tonal button */
export const SMALL_BUTTON = 'h-8 gap-1.5 px-3 has-[>svg:first-child]:pl-3';

/** 36px choice chip: candidate shows and episodes */
export const CHIP =
  'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-white/6 px-4 text-caption font-medium text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] transition-[background-color,color] hover:bg-white/11 hover:text-white aria-pressed:bg-white aria-pressed:text-[#171717] aria-pressed:shadow-none max-md:h-8 max-md:px-3';

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
