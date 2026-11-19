/**
 * Class lists the review items share with the rest of the importer (links,
 * small buttons, chips). One-off values stay in their component.
 */

/** Text action: white/80, underlined on hover */
export const LINK =
  'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-body-sm font-medium text-white/80 underline-offset-3 transition-[background-color,color] hover:text-white hover:underline';

/** 32px tonal button */
export const SMALL_BUTTON = 'h-8 gap-1.5 px-3 has-[>svg:first-child]:pl-3';

/** 36px choice chip: candidate shows and episodes */
export const CHIP =
  'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-white/6 px-4 text-caption font-medium text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] transition-[background-color,color] hover:bg-white/11 hover:text-white aria-pressed:bg-white aria-pressed:text-[#171717] aria-pressed:shadow-none max-md:h-8 max-md:px-3';
