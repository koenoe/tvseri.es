import { IDENTITY_BLOCK } from '@/components/ui/identity/IdentityLines';

/**
 * Overview or sub-page, decided by CSS in the static shell: every
 * sub-page's `@aside` entry renders a `SubpageMarker`, and the profile frame
 * (`group/profile`) restyles the identity with `:has()` while it is there.
 * No JavaScript and no viewer read, so the shell of every profile page
 * already has the right identity.
 */

/** On the frame: the group the variants below read */
export const PROFILE_GROUP_CLASS = 'group/profile';

/**
 * The full identity: on the overview, and on a sub-page from lg up.
 * On a tablet (md to lg, the phone's shell) the page column is 704–959px:
 * the handle keeps the whole width, the counts sit in the left half and
 * Watches on with the button in the right, each half the sidebar's width,
 * instead of a 700px-wide button and a services row stretched across.
 */
export const FULL_IDENTITY_CLASS = `${IDENTITY_BLOCK} max-lg:group-has-[[data-subpage]]/profile:hidden md:max-lg:grid md:max-lg:grid-cols-2 md:max-lg:items-start md:max-lg:gap-x-10 md:max-lg:[&>:first-child]:col-span-2 md:max-lg:[&>:last-child]:col-start-2 md:max-lg:[&>:nth-child(2)]:row-span-2`;

/** The compact identity: sub-pages below lg only */
export const COMPACT_IDENTITY_CLASS =
  'hidden items-center justify-between gap-3 pt-2 max-lg:group-has-[[data-subpage]]/profile:flex';

/** What only the overview's identity draws (Watches on) */
export const OVERVIEW_ONLY_CLASS =
  'contents group-has-[[data-subpage]]/profile:hidden';
