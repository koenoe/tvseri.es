import { TEXT_LINK_HOVER } from '@/components/header/headerIconButton';
import cn from '@/lib/cn';

/*
 * What both layouts share: the current page is a 16 × 2px white
 * rule 26px before the word and the word stepped 26px right (a transform,
 * 200ms); lowercase by CSS only; the white ring on keyboard focus.
 */
export const MARKED_WORD =
  'pointer-events-auto relative inline-flex items-center rounded-6 lowercase transition-transform duration-200 ease-[cubic-bezier(.25,.1,.25,1)] focus-visible:outline-offset-4 before:absolute before:top-1/2 before:left-[-26px] before:-mt-px before:h-0.5 before:w-4 before:bg-white before:opacity-0 aria-[current=page]:translate-x-[26px] aria-[current=page]:before:opacity-100';

/**
 * The account line's words: the text links' slight dim on hover (no
 * underline); the current page stays underlined.
 */
export const ACCOUNT_WORD = cn(
  'pointer-events-auto inline-flex min-h-12 items-center gap-1.5 rounded-6 text-[15px] leading-5 font-medium lowercase underline-offset-[6px] focus-visible:outline-offset-4 aria-[current=page]:underline',
  TEXT_LINK_HOVER,
);

/** WATCH, YOU · @handle, ACCOUNT */
export const GROUP_LABEL = 'truncate text-overline text-white/60 uppercase';

/*
 * The open menu's glass, not the pill's: blur 20 and saturate 1.2 over a
 * tint with a white 5% wash. On a slow device (`data-flat-glass`, set
 * before the first paint) and with reduced transparency the blur goes and
 * the tint thickens to 94%, so the page behind can't compete with the words.
 */
const GLASS_BLUR =
  'backdrop-blur-[20px] backdrop-saturate-120 [html[data-flat-glass]_&]:backdrop-filter-none [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [html[data-flat-glass]_&]:bg-[linear-gradient(rgb(255_255_255/0.05),rgb(255_255_255/0.05)),linear-gradient(rgb(17_19_20/0.94),rgb(17_19_20/0.94))] [@media(prefers-reduced-transparency:reduce)]:bg-[linear-gradient(rgb(255_255_255/0.05),rgb(255_255_255/0.05)),linear-gradient(rgb(17_19_20/0.94),rgb(17_19_20/0.94))]';

/**
 * The open menu's glass, the same on desktop (the side panel) and phones
 * (full screen): an 84% tint under the 5% white wash.
 */
export const MENU_GLASS = `bg-[linear-gradient(rgb(255_255_255/0.05),rgb(255_255_255/0.05)),linear-gradient(rgb(17_19_20/0.84),rgb(17_19_20/0.84))] ${GLASS_BLUR}`;

/** The phone's labels, account words and note. */
export const PHONE_DIM = 'text-white/80';
