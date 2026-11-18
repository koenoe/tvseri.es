/**
 * The wall's grids and its tiles' frames, shared by the wall (`FocusWall`,
 * `WallTiles`) and its loading ghosts (`EpisodesSkeleton`), so a placeholder
 * is built from the wall's own layout and can't drift from it.
 */

/** 1 column on phones, 2 on tablets, 3 of 392 on desktop */
const GRID =
  'grid grid-cols-1 items-start gap-3 md:mt-6 md:grid-cols-2 md:gap-6 lg:grid-cols-3';

/** The wall's grid. Row flow without backfill: Focus, then the open episodes in order. */
export const WALL_GRID = `mt-1 ${GRID}`;

/**
 * The "N watched" group, one grid gap under the part above (`mt-3` on a
 * phone, or the wall's own `mt-1` when it is all there is): its compact tiles
 * backfill the row end a two-column stack leaves.
 */
export const WATCHED_GRID = `grid-flow-row-dense ${GRID}`;

/**
 * The Focus tile's frame, still and text per desktop layout (`FocusLayout`).
 * From md the tile is 752px tall (the two tiles beside it). Stacked, the
 * text holds the room of a two-line synopsis (236px) and the still takes
 * the rest, so the Next up pill sits at the still's bottom left and stays
 * in that spot from one episode to the next (controls never slide under
 * the pointer); a shorter synopsis leaves its
 * missing lines' room under the text, and only a three-line one shrinks the
 * picture by a line.
 */
export const FOCUS = {
  tall: {
    body: 'md:min-h-59 md:px-8 md:py-6',
    frame: 'md:col-span-2 md:row-span-2 md:h-188',
    overview: 'md:line-clamp-3',
    still: 'md:h-auto md:min-h-0 md:flex-1',
    title: 'truncate',
  },
  // Across the row: the still over two columns (16:9, as tall at 1216), the
  // text in the third; tablet and phone draw it as tall.
  wide: {
    body: 'md:min-h-59 md:px-8 md:py-6 lg:min-h-0 lg:flex-1 lg:justify-center lg:py-8',
    frame: 'md:col-span-2 md:h-188 lg:col-span-3 lg:h-auto lg:flex-row',
    overview: 'md:line-clamp-3 lg:line-clamp-4',
    still:
      'md:h-auto md:min-h-0 md:flex-1 lg:aspect-video lg:w-[calc((100%-3rem)*2/3+1.5rem)] lg:flex-none',
    title: 'truncate lg:line-clamp-2 lg:whitespace-normal',
  },
} as const;

/** The Focus tile's still and text column (layout classes added per layout). */
export const FOCUS_STILL = 'relative h-49 flex-none overflow-hidden bg-black';
export const FOCUS_BODY = 'relative flex min-w-0 flex-none flex-col gap-3 p-4';

/**
 * An episode tile: 364px on tablets and up (two beside a tall Focus share
 * its height), the still over the text. The text keeps its 20px padding
 * under its last line: from md the body holds the room of its longest
 * content (title, two lines of overview, date · runtime: 160px) and the
 * still takes the rest (204px, object-cover crops), so the stills of a row
 * line up and a longer body would shrink the picture, never the padding.
 * Phones size the tile by its content.
 */
export const TILE_FRAME = 'flex flex-col md:h-91';
export const TILE_STILL =
  'relative h-49 flex-none overflow-hidden bg-black md:h-auto md:min-h-0 md:flex-1';
export const TILE_BODY =
  'relative flex min-w-0 flex-none flex-col gap-3 px-6 py-5 md:min-h-40';
