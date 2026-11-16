import { BELOW_FLOATING_HEADER_LG } from '@/components/header/belowFloatingHeader';

/**
 * The person page's grid, sidebar, sections and lanes, shared by the page and
 * its placeholders (`PersonSkeleton`, `Skeletons`, each section's ghost) so
 * both draw the same boxes.
 */

/** The page grid */
export const PERSON_MAIN =
  // ends on its last section: the air above the footer is the footer's
  'mx-auto flex w-full max-w-page flex-col gap-12 px-gutter pt-[23px] md:pt-0 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-16 lg:pt-[31px]';

/** The sections' column beside the sidebar */
export const PERSON_COLUMN = 'flex min-w-0 flex-col gap-12 lg:gap-[72px]';

/** The sidebar: sticky beside the column on desktop, the page's header on phones */
export const PERSON_SIDEBAR = `flex min-w-0 flex-col gap-4 lg:sticky lg:top-8 lg:gap-7 ${BELOW_FLOATING_HEADER_LG}`;

/** The sidebar's head (the page's header on phones) */
export const PERSON_SIDE_HEADER =
  'grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 lg:flex lg:flex-col lg:gap-7';

/** A section of the column: its `SectionHead` over its content */
export const PERSON_SECTION = 'flex flex-col gap-4 lg:gap-6';

/** The dark lane a section draws its content on (Career, Awards) */
export const PERSON_LANE = 'rounded-16 bg-black/22';

/**
 * A row of tiles (Known for, Collaborators): a snap row across the gutters on
 * phones, a grid from lg (the section adds its columns and gap).
 */
export const PERSON_SNAP_ROW =
  '-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter scrollbar-none lg:mx-0 lg:grid lg:overflow-visible lg:px-0';

/** Frequent collaborators from lg: six across (below lg the snap row's 12px gap) */
export const COLLABORATOR_GRID = 'lg:grid-cols-6 lg:gap-4';

/** A collaborator: a 96px face (a grid column from lg), name and role under it */
export const COLLABORATOR_TILE =
  'flex w-24 shrink-0 flex-col gap-1.5 lg:w-auto lg:min-w-0 lg:gap-2';

/**
 * A collaborator's role line, right under the name: the margin takes back
 * the tile's gap, which belongs between the face and the name. The placeholder's second line uses it too.
 */
export const COLLABORATOR_ROLE_LINE = 'text-caption -mt-1.5 lg:-mt-2';
