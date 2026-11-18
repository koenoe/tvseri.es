/**
 * The show page's section frames, shared by the page and its loading shell
 * (`ShowSkeleton`), so both draw the same boxes.
 */

/** "Created by" and the cast, at every width (phones: the stack) */
export const CAST_FRAME = 'mx-auto max-w-page px-gutter';

/**
 * "Created by"'s line, at every width. Desktop's actions row carries its own
 * 24px above it; the phone's carries none, so the line takes the 32px the
 * stack keeps under the actions.
 */
export const CREATED_BY_LINE = 'max-md:mt-8';

export const EPISODES_SECTION =
  'relative z-26 mx-auto mt-10 mb-16 w-full max-w-page px-gutter md:mb-22';

/** The recommendations sit 2px higher than the section's own spacing. */
export const RECOMMENDATIONS_FRAME = '-mt-0.5';

/**
 * The lower band: Storyline and Information on the page colour darkened 10%.
 * It ends the page and meets the footer's band: its negative bottom margin
 * is the footer's air (48px, 64 from md), so no stripe of page colour lies
 * between the two bands. Kept on the band itself: a rule on the document
 * would still match a show page the router keeps, hidden, after leaving it.
 */
export const LOWER_BAND =
  'relative mt-10 -mb-12 py-10 after:pointer-events-none after:absolute after:inset-0 after:bg-black/10 md:mt-22 md:-mb-16 md:py-16';

export const LOWER_BAND_INNER = 'relative z-[1] mx-auto max-w-page px-gutter';

export const STORYLINE_GRID =
  'mb-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-10';

/** As tall as its own text: the keywords beside it never stretch it. */
export const STORYLINE_BOX =
  'self-start rounded-12 bg-white/3.5 p-4 text-body text-white/80 md:col-span-2';

export const INFORMATION_GRID =
  'grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-x-10';

/**
 * The line's box, for every viewer (signed out it states the series' size):
 * 44px on phones (a tap target), 40px on desktop. The hero's spacing around
 * it is `HERO_TITLE_SPACE` in `hero/heroLayout.ts`.
 */
export const PROGRESS_LINE_SPACE =
  '-ml-2.5 mb-2 h-11 w-[calc(100%+20px)] max-md:-mt-3 md:mb-4 md:h-10 md:w-[730px] md:max-w-[calc(100%+20px)]';
