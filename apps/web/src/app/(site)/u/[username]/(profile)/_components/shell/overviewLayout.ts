/**
 * The overview's frame, decided by CSS in the static shell as overview or
 * sub-page is (`subpage.ts`): the overview's `@aside` entry renders
 * `PageKindMarker`, and the `profile-overview:` variant reads it.
 * The page reads in its DOM order at every width:
 *
 * - Desktop: the sidebar is the identity and the `@aside` blocks (a rule,
 *   someone else's match card), and under it the `@tail` blocks
 *   (Watchlist, Start something new, the year), placed in the sidebar's
 *   column after the main column in the DOM. It scrolls with the page (the
 *   sub-pages' sidebars stick): the tail can't stick with the identity.
 * - Tablet and phone: one column, the tail's blocks after the page.
 * - Phone: 20px between everything; the identity, someone else's match card
 *   and the tabs, then the page.
 */

/** On the frame */
export const OVERVIEW_GRID =
  'max-md:profile-overview:gap-5 lg:profile-overview:grid-rows-[auto_1fr] lg:profile-overview:gap-y-10';

/** On the sidebar: scrolls with the page on the overview, so never moves for the header */
export const OVERVIEW_SIDEBAR =
  'max-md:profile-overview:gap-5 lg:profile-overview:static lg:profile-overview:header-floating:translate-y-0';

/** On the main column: beside the sidebar and its tail */
export const OVERVIEW_MAIN =
  'max-md:profile-overview:gap-5 lg:profile-overview:row-span-2';

/** Not on a phone: Home has its own pick */
export const NOT_ON_PHONE = 'max-md:hidden';
