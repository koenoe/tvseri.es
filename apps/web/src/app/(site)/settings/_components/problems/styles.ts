import { HIT_ALL, HIT_Y } from '@/components/ui/button/hitArea';

/**
 * Class lists the review items share with the rest of the importer (links,
 * small buttons, chips). One-off values stay in their component.
 */

/** Text action: white/80, underlined on hover (positioned for its reach) */
export const LINK_BASE =
  'relative inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-body-sm font-medium text-white/80 underline-offset-3 transition-[background-color,color] hover:text-white hover:underline';

/**
 * The text action on its own: Undo and Try again are frequent taps, so the
 * 24px line reaches 44px to the pointer
 */
export const LINK = `${LINK_BASE} ${HIT_ALL[10]}`;

/** 32px tonal button, 40px to the pointer */
export const SMALL_BUTTON = `relative h-8 gap-1.5 px-3 has-[>svg:first-child]:pl-3 ${HIT_Y[4]}`;

/** 36px choice chip (candidate shows and episodes), 40px to the pointer */
export const CHIP = `relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-white/6 px-4 text-caption font-medium text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/11 active:scale-96 hover:text-white aria-pressed:bg-white aria-pressed:text-[#171717] aria-pressed:shadow-none ${HIT_Y[2]}`;
