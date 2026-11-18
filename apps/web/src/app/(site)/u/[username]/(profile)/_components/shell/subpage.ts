import { IDENTITY_BLOCK } from '@/components/ui/identity/IdentityLines';

/**
 * Overview or sub-page, decided by CSS in the static shell: every page's
 * `@aside` entry renders a `PageKindMarker`, and the profile frame's
 * `profile-subpage:` / `profile-overview:` variants (`globals.css`) restyle
 * the frame and the identity. No viewer read, so the shell of every profile
 * page already has the right identity; the marker writes the kind on the
 * frame as a page shows, so a page React's `Activity` keeps hidden after a
 * client navigation never counts.
 */

/** On the frame: the group some blocks read */
export const PROFILE_GROUP_CLASS = 'group/profile';

/**
 * The full identity: on the overview, and on a sub-page from lg up.
 * On a tablet (md to lg, the phone's shell) the page column is 704–959px:
 * the handle keeps the whole width, the counts sit in the left half and
 * Watches on with the button in the right, each half the sidebar's width,
 * instead of a 700px-wide button and a services row stretched across.
 */
export const FULL_IDENTITY_CLASS = `${IDENTITY_BLOCK} max-lg:profile-subpage:hidden md:max-lg:grid md:max-lg:grid-cols-2 md:max-lg:items-start md:max-lg:gap-x-10 md:max-lg:[&>:first-child]:col-span-2 md:max-lg:[&>:last-child]:col-start-2 md:max-lg:[&>:nth-child(2)]:row-span-2`;

/** The compact identity: sub-pages below lg only */
export const COMPACT_IDENTITY_CLASS =
  'hidden items-center justify-between gap-3 pt-2 max-lg:profile-subpage:flex';
