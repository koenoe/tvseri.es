/**
 * A picture under a dark overlay (a shade, veil, fade or dim) in a card that
 * clips with rounded corners (`overflow-hidden` and a radius).
 *
 * The card's rounded clip is applied to each thing drawn inside it on its
 * own: first the picture, then the overlay. Where the edge crosses a pixel
 * only partly (every pixel of a rounded corner), the picture covers part of
 * that pixel and the overlay covers the same part of what is now there, so
 * a share of the bright picture shows through: a thin light line along the
 * corners. One composited layer or several makes no difference (a
 * transform, an animation, `will-change` or an image on its own layer only
 * add to it), and a clip or a mask on the card itself still clips them
 * apart.
 *
 * The cure: the picture and everything that darkens it live in one element
 * inside the card (`PICTURE_LAYER`), drawn as one surface first (a mask that
 * hides nothing) and then clipped once by the card's corners. Text, buttons
 * and rings stay outside it, above. It keeps the card's box, so nothing in
 * the picture moves.
 *
 * A card that scales (a hover grow) puts its straight edges on part pixels
 * too, where the picture's own edge and its shade's meet: there the shade
 * reaches a pixel past the card (`-inset-px` instead of `inset-0`), so the
 * edge always cuts through shade.
 *
 * - `PICTURE_LAYER`: that element, filling the card.
 * - `PICTURE_SURFACE`: the surface alone, for an element that is already there.
 * - `PICTURE_SURFACE_LG`: the same from lg only.
 *
 * The mask draws the element offscreen: cheap for a card, even one whose
 * picture moves (a Ken Burns, a hover zoom), but keep it off an element that
 * repaints on every scroll frame. `e2e/picture-edges.spec.ts` checks pages
 * for the line; a deliberate light ring is marked `data-hairline`.
 */
export const PICTURE_SURFACE = '[mask-image:linear-gradient(#000,#000)]';

export const PICTURE_SURFACE_LG = 'lg:[mask-image:linear-gradient(#000,#000)]';

export const PICTURE_LAYER = `absolute inset-0 ${PICTURE_SURFACE}`;
