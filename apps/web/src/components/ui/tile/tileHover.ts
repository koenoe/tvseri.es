/**
 * The one tile hover (TLHover variant A, simple and clean): Home's grow everywhere, on the boards' curve. A poster grows 4%
 * in 250ms, a backdrop tile 3%; nothing else changes (no lift, no ring, no
 * brightness). On touch a press shrinks the tile to 98%, so a tap is felt.
 * Keyboard focus keeps the site's ring. Transform only, on the compositor.
 *
 * Rows clip their scroll box, so a growing tile needs room around it:
 * `Row`'s rail keeps its padding for that (TLHover: 24px above, the line
 * below, 32px at the ends).
 *
 * The lens tiles and the cast avatars keep their own hovers: gestures with a
 * reveal, not a tile.
 */

const MOTION =
  'transition-transform duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-coarse:active:scale-98';

/** A poster (and any portrait tile): grows 4% */
export const TILE_HOVER = `${MOTION} hover:scale-104`;

/** A backdrop tile, a ticket or a treemap cell: grows 3% */
export const TILE_HOVER_WIDE = `${MOTION} hover:scale-103`;

/**
 * An episode tile: it never grows (its text never scales) and draws no ring;
 * put `EPISODE_TILE_HOVER` on the tile and `EPISODE_STILL_ZOOM` on its
 * still, which zooms 3% inside its frame.
 */
export const EPISODE_TILE_HOVER = 'group/eptile';

/** The still inside an episode tile: zooms 3% within its (clipping) frame */
export const EPISODE_STILL_ZOOM =
  'transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/eptile:scale-103';
