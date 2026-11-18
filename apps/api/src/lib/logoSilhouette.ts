import sharp from 'sharp';

/**
 * Whether a network's logo still reads when the web draws it as a white
 * silhouette (every opaque pixel white). A logo carries its mark in one of
 * two ways:
 *
 * - its outline (alpha): letters on a transparent ground, or letters cut
 *   out of a box. Whitened, the outline stays: it passes.
 * - its colours (luminance) inside a solid shape: a coloured block with
 *   letters in another colour, a disc with letters in white. Whitened, it
 *   is a blank box or disc: it fails.
 *
 * Measured on the logo trimmed to its opaque pixels, so a transparent margin
 * changes nothing:
 *
 * - fill: the share of the trimmed box that is opaque. A rectangle, a badge
 *   or an image without alpha fills it (over FILL_LIMIT).
 * - inner edges: of the logo's edges (neighbouring pixels that differ), the
 *   share between two opaque pixels of different luminance rather than
 *   between opaque and transparent. Over INNER_EDGE_LIMIT, most of what
 *   draws the mark is inside the shape, and the silhouette loses it (a disc
 *   or a slanted block that fills less than FILL_LIMIT of its box).
 *
 * Tuned on about 110 of TMDB's network logos: transparent wordmarks (HBO,
 * Netflix, AMC, Apple TV, BBC One's boxes with cut-out letters) fill 0.17
 * to 0.77 of their box with inner edges under 0.29; blocks without alpha
 * (TF1, Canal+) fill 1; ABC's disc and Cinemax's slanted block have inner
 * edges near 0.7. Logos with one solid part among outlined ones (PBS's
 * head, TVB's ellipse) sit at 0.32 to 0.39 and fail: their colours on a
 * chip read better than a silhouette with a blank part. A false fail only
 * costs a chip; a false pass draws a blank shape.
 */

const FILL_LIMIT = 0.85;
const INNER_EDGE_LIMIT = 0.3;

/** Opaque from half alpha up, as the whitened logo is seen */
const OPAQUE_ALPHA = 128;
/** Luminance (0–1) apart for two opaque pixels to draw an edge */
const LUMINANCE_STEP = 0.25;
/** Measured at most this size: the shares don't depend on it, the cost does */
const MAX_WIDTH = 400;
const MAX_HEIGHT = 96;

const luminance = (data: Uint8Array, pixel: number) =>
  (0.2126 * data[pixel * 4]! +
    0.7152 * data[pixel * 4 + 1]! +
    0.0722 * data[pixel * 4 + 2]!) /
  255;

/** Inclusive pixel edges */
type Box = Readonly<{
  bottom: number;
  left: number;
  right: number;
  top: number;
}>;

/** The bounding box of the opaque pixels, or null when there are none */
const opaqueBox = (opaque: Uint8Array, width: number): Box | null => {
  let left = width;
  let top = Number.POSITIVE_INFINITY;
  let right = -1;
  let bottom = -1;
  for (let pixel = 0; pixel < opaque.length; pixel++) {
    if (opaque[pixel]) {
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? null : { bottom, left, right, top };
};

export async function survivesSilhouette(image: Buffer): Promise<boolean> {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .resize({
      fit: 'inside',
      height: MAX_HEIGHT,
      width: MAX_WIDTH,
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { height, width } = info;

  const opaque = new Uint8Array(width * height);
  for (let pixel = 0; pixel < opaque.length; pixel++) {
    opaque[pixel] = data[pixel * 4 + 3]! >= OPAQUE_ALPHA ? 1 : 0;
  }

  const box = opaqueBox(opaque, width);
  if (!box) {
    return true;
  }

  let filled = 0;
  let outerEdges = 0;
  let innerEdges = 0;
  for (let y: number = box.top; y <= box.bottom; y++) {
    for (let x: number = box.left; x <= box.right; x++) {
      const pixel = y * width + x;
      filled += opaque[pixel]!;
      // each pair once: the right and the lower neighbour, inside the box
      const neighbours = [
        x < box.right ? pixel + 1 : -1,
        y < box.bottom ? pixel + width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0) {
          continue;
        }
        if (opaque[pixel] !== opaque[neighbour]) {
          outerEdges++;
        } else if (
          opaque[pixel] &&
          Math.abs(luminance(data, pixel) - luminance(data, neighbour)) >
            LUMINANCE_STEP
        ) {
          innerEdges++;
        }
      }
    }
  }

  const area = (box.right - box.left + 1) * (box.bottom - box.top + 1);
  if (filled / area > FILL_LIMIT) {
    return false;
  }
  const edges = outerEdges + innerEdges;
  return edges === 0 || innerEdges / edges <= INNER_EDGE_LIMIT;
}
