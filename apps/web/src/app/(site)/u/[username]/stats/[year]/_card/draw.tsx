import 'server-only';

import { ImageResponse } from 'next/og';
import sharp from 'sharp';

import CardImage from './CardImage';
import type { CardModel } from './cardModel';
import { loadCardFonts } from './fonts';
import { CARD_LAYOUTS, type CardLayoutName } from './layout';
import { loadPoster, missesPoster } from './posters';
import { type CardTheme, themeStyle } from './theme';
import { wallLayout } from './wall';

type DrawInput = Readonly<{
  model: CardModel;
  colour: string | null;
  layout: CardLayoutName;
  theme: CardTheme;
}>;

type DrawnCard = Readonly<{
  /** The JPEG */
  image: Uint8Array<ArrayBuffer>;
  /** A poster that should be on the card is missing (a failed fetch) */
  degraded: boolean;
}>;

/**
 * `next/og` gives a PNG, which is the wrong format for a wall of posters and
 * gradients (~1.1 MB for the story): `sharp` re-encodes it as a JPEG
 * (mozjpeg, quality 85), about a fifth of the bytes.
 */
const toJpeg = async (png: ArrayBuffer): Promise<Uint8Array<ArrayBuffer>> =>
  new Uint8Array(
    await sharp(Buffer.from(png))
      .jpeg({ mozjpeg: true, quality: 85 })
      .toBuffer(),
  );

/**
 * Renders the card to JPEG bytes with `next/og`. Posters are fetched first
 * (each at the size it's drawn), so satori never fetches and a missing one
 * becomes the title tile instead of failing the render.
 */
export async function drawCard({
  colour,
  layout: name,
  model,
  theme,
}: DrawInput): Promise<DrawnCard> {
  const layout = CARD_LAYOUTS[name];
  const cells = wallLayout(layout.wall, model.top.length);
  const sources = cells.map(
    (cell) => model.top[cell.rank]?.posterImage ?? null,
  );
  const [fonts, posters] = await Promise.all([
    loadCardFonts(),
    Promise.all(
      cells.map((cell, index) =>
        loadPoster(sources[index] ?? null, cell.width),
      ),
    ),
  ]);
  const card = (
    <CardImage
      layout={layout}
      model={model}
      posters={posters}
      style={themeStyle(theme, colour)}
    />
  );
  const response = new ImageResponse(card, {
    fonts: [...fonts],
    height: Math.round(layout.height),
    width: Math.round(layout.width),
  });
  return {
    degraded: missesPoster(sources, posters),
    image: await toJpeg(await response.arrayBuffer()),
  };
}
