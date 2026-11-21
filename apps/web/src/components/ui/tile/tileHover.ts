/**
 * The one tile hover: Home's grow everywhere. A poster grows 4%, a backdrop
 * tile 3%; nothing else changes (no lift, no ring, no brightness). 150ms: the
 * pointer crosses tiles all the time, so the grow answers at once instead of
 * playing. On touch a press shrinks the tile to 98%, so a tap is felt.
 * Keyboard focus keeps the site's ring. Transform only, on the compositor.
 *
 * Rows clip their scroll box, so a growing tile needs room around it:
 * `Row`'s rail keeps its padding for that (24px above and below, the gutters
 * at the ends).
 *
 * The lens tiles and the cast avatars keep their own hovers: gestures with a
 * reveal, not a tile.
 */

const MOTION =
  'transition-transform duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-coarse:active:scale-98';

/** A poster (and any portrait tile): grows 4% */
export const TILE_HOVER = `${MOTION} hover:scale-104`;

/** A backdrop tile, a ticket or a treemap cell: grows 3% */
export const TILE_HOVER_WIDE = `${MOTION} hover:scale-103`;

/**
 * A picture link that never grows (an episode tile, Home's stills, the
 * season picture, From the archive): its text never scales and it draws no
 * ring; the picture comes 3% closer inside its clipping frame instead, so
 * every picture card answers the pointer alike. Put `PICTURE_ZOOM_GROUP` on
 * the link and `PICTURE_ZOOM` on its image.
 */
export const PICTURE_ZOOM_GROUP = 'group/picture';

export const PICTURE_ZOOM =
  'transition-transform duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/picture:scale-103';
