import cn from '@/lib/cn';

/**
 * The result rows' geometry (poster grid and people row), shared by
 * the options and their ghosts, so a ghost row takes exactly the
 * boxes the results fill in: the same grid, the same boxes, the same line
 * heights (a text line's box is its type token's line height).
 */

/**
 * Four across; on a phone posters go three across and people one sideways
 * strip. A member found by their handle is a chip, laid out like the recents.
 */
export const GRID = {
  members: 'flex flex-wrap gap-2',
  people:
    'grid grid-cols-4 gap-x-4 gap-y-6 max-md:-mx-gutter max-md:flex max-md:gap-3 max-md:overflow-x-auto max-md:px-gutter max-md:py-1 max-md:scrollbar-none',
  shows: 'grid grid-cols-4 gap-x-4 gap-y-6 max-md:grid-cols-3 max-md:gap-x-3',
} as const;

/** A block's overline (“Shows”, “People”); the second block starts 32 below the first. */
export const overlineClasses = (first: boolean) =>
  cn('mb-3 text-overline', !first && 'mt-8');

export const SHOW = {
  /** The poster: 2:3, radius 8 */
  poster: 'relative block aspect-2/3 rounded-8',
  /** The cell: a column */
  tile: 'relative flex min-w-0 flex-col',
  /** The title line, 12 below the poster (14/24) */
  title: 'mt-3 text-body-sm',
  /** The year line, 4 below (a meta row, 20) */
  year: 'mt-1',
} as const;

export const PERSON = {
  /** The round face, 72 (64 on a phone), 12 above the name */
  face: 'relative mb-3 size-18 max-md:size-16',
  /** What they're known for: desktop only */
  knownFor: 'mt-1 w-full justify-center max-md:hidden',
  /** The name line (14/24); two lines on a phone */
  name: 'w-full text-body-sm max-md:min-h-12',
  role: 'w-full justify-center',
  /** The cell: centred, 4 above and below; 96 wide in the phone strip */
  tile: 'relative flex min-w-0 flex-col items-center py-1 text-center max-md:w-24 max-md:shrink-0',
} as const;
