import { UNKNOWN_COLOR } from '@tvseri.es/utils';
import type { CSSProperties } from 'react';

import { PICTURE_SURFACE } from '@/components/ui/picture/pictureSurface';

/**
 * A rounded card with a picture under its content (From the archive, Did you
 * know, Next big premiere). Where the card lands on a part pixel, a layer
 * that ends exactly on its edge covers that edge row only partly and the
 * bright picture shows through as a hairline; at the rounded corners each
 * layer is also clipped on its own, so the picture shows through its shade
 * in the corners' part pixels. So the picture's layers reach a pixel past
 * the card and are drawn as one layer, clipped once (`PICTURE_BLEED`), and a
 * one-pixel ring in the card's own colour closes the edge above everything.
 * The card sets that colour as `--picture-edge`.
 */
export const PICTURE_CARD =
  'relative isolate overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:z-3 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_var(--picture-edge)]';

/**
 * The picture and its shade: a pixel past the card on every side, one
 * surface (`PICTURE_SURFACE`), so the card's rounded corners clip them
 * together
 */
export const PICTURE_BLEED = `absolute -inset-px ${PICTURE_SURFACE}`;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** The API's backdrop colour when it couldn't detect one */

/**
 * How much of the picture's colour the shade keeps (the rest is black), so
 * the shade reads as the picture rather than black. The API serves the
 * colour as a page ground (white at 60% reads on it at 4.5:1); at half of
 * even the brightest of those, white text keeps 4.5:1 wherever the shade is
 * 65% or more, over a white picture too.
 */
export const PICTURE_SHADE_SHARE = 0.5;

/**
 * The shade's colour for a picture card whose shade follows its picture
 * (Did you know, the Countdown): the picture's colour (the API's
 * `backdropColor`), darkened, as `--picture-shade` on the element holding
 * the picture and its shade. The shade's classes read it with their own
 * near-black as the fallback, so without a known colour ('#000000', missing
 * or not a six-digit hex) nothing is set and the card keeps that shade.
 */
export function pictureShade(
  color: string | undefined,
): CSSProperties | undefined {
  if (!color || !HEX_COLOR.test(color) || color === UNKNOWN_COLOR) {
    return undefined;
  }
  const mix = `color-mix(in srgb, ${color.toLowerCase()} ${PICTURE_SHADE_SHARE * 100}%, black)`;
  return { '--picture-shade': mix } as CSSProperties;
}
