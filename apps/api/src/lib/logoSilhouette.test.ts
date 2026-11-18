import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { survivesSilhouette } from './logoSilhouette';

type Rgba = readonly [number, number, number, number];

const CLEAR: Rgba = [0, 0, 0, 0];
const RED: Rgba = [229, 9, 20, 255];
const BLACK: Rgba = [0, 0, 0, 255];
const WHITE: Rgba = [255, 255, 255, 255];
const BLUE: Rgba = [20, 40, 200, 255];

/** A rectangle in pixels: x, y, width, height */
type Rect = readonly [number, number, number, number];

const W = 200;
const H = 60;

/** Three letter-like shapes (an H, an I and an L), 10px strokes */
const LETTERS: ReadonlyArray<Rect> = [
  // H
  [20, 10, 10, 40],
  [50, 10, 10, 40],
  [30, 25, 20, 10],
  // I
  [80, 10, 10, 40],
  // L
  [110, 10, 10, 40],
  [120, 40, 30, 10],
];

const paint = (
  pixels: Uint8Array,
  rects: ReadonlyArray<Rect>,
  colour: Rgba,
) => {
  for (const [x0, y0, w, h] of rects) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        pixels.set(colour, (y * W + x) * 4);
      }
    }
  }
};

/** A PNG drawn as a ground colour with layers of rectangles on top */
const png = async (
  ground: Rgba,
  layers: ReadonlyArray<Readonly<{ colour: Rgba; rects: ReadonlyArray<Rect> }>>,
  options: Readonly<{ alpha?: boolean }> = {},
) => {
  const pixels = new Uint8Array(W * H * 4);
  paint(pixels, [[0, 0, W, H]], ground);
  for (const { colour, rects } of layers) {
    paint(pixels, rects, colour);
  }
  const image = sharp(pixels, { raw: { channels: 4, height: H, width: W } });
  return (options.alpha === false ? image.removeAlpha() : image)
    .png()
    .toBuffer();
};

/** A filled disc of the given colour, inside a 60 × 60 square at x 0 */
const disc = (pixels: Uint8Array, colour: Rgba) => {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < H; x++) {
      if ((x - 29.5) ** 2 + (y - 29.5) ** 2 <= 30 ** 2) {
        pixels.set(colour, (y * W + x) * 4);
      }
    }
  }
};

describe('survivesSilhouette', () => {
  it('passes a transparent wordmark: its letters are its shape', async () => {
    const image = await png(CLEAR, [{ colour: RED, rects: LETTERS }]);
    expect(await survivesSilhouette(image)).toBe(true);
  });

  it('fails a filled rectangle with letters in another colour: whitened it is a blank box', async () => {
    const image = await png(BLUE, [{ colour: WHITE, rects: LETTERS }]);
    expect(await survivesSilhouette(image)).toBe(false);
  });

  it('fails a logo without an alpha channel (an opaque block)', async () => {
    const image = await png(WHITE, [{ colour: BLACK, rects: LETTERS }], {
      alpha: false,
    });
    expect(await survivesSilhouette(image)).toBe(false);
  });

  it('passes boxes whose letters are cut out (holes keep their shape)', async () => {
    const boxes: ReadonlyArray<Rect> = [
      [10, 5, 50, 50],
      [70, 5, 50, 50],
      [130, 5, 50, 50],
    ];
    const holes: ReadonlyArray<Rect> = [
      // a B-like, an L-like and a C-like cut-out, one per box
      [22, 15, 8, 30],
      [30, 15, 16, 8],
      [30, 27, 16, 7],
      [30, 37, 16, 8],
      [82, 15, 8, 30],
      [90, 37, 18, 8],
      [142, 15, 8, 30],
      [150, 15, 18, 8],
      [150, 37, 18, 8],
    ];
    const image = await png(CLEAR, [
      { colour: BLACK, rects: boxes },
      { colour: CLEAR, rects: holes },
    ]);
    expect(await survivesSilhouette(image)).toBe(true);
  });

  it('fails a disc whose letters differ only in colour (whitened, a blank disc)', async () => {
    const pixels = new Uint8Array(W * H * 4);
    disc(pixels, BLACK);
    paint(
      pixels,
      // letter strokes across most of the disc, as ABC's are
      [12, 20, 28, 36, 44].map((x): Rect => [x, 16, 4, 28]),
      WHITE,
    );
    const image = await sharp(pixels, {
      raw: { channels: 4, height: H, width: W },
    })
      .png()
      .toBuffer();
    expect(await survivesSilhouette(image)).toBe(false);
  });

  it('passes a fully transparent image (nothing to lose)', async () => {
    const image = await png(CLEAR, []);
    expect(await survivesSilhouette(image)).toBe(true);
  });
});
