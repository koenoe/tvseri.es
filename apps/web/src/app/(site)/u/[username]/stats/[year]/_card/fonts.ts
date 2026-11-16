import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The card's fonts for satori (WOFF: satori reads TTF, OTF and WOFF, never
 * WOFF2). Inter sets its optical size from the font size (axis
 * 14–32): Inter Display (32) for every size past 32 and the story's 32px
 * labels; the 400 at optical size 28 for the square's 28px labels (an
 * instance of Inter's variable font), so the light labels set as wide as
 * intended (the story's streak line 506px). Tabular figures are frozen
 * into 700 and 800 (satori can't switch OpenType features); the 400s keep
 * their kerning. Plus Jakarta Sans 800 draws the
 * handle. Latin subsets, ~90 KB in all, OFL (fonts/OFL.txt).
 *
 * Each path is a literal under `process.cwd()`, as Next's docs read fonts
 * for `ImageResponse`, so the build traces the files into the function.
 */

export const CARD_FONT = {
  inter: 'Inter Display',
  inter28: 'Inter Optical 28',
  jakarta: 'Plus Jakarta Sans',
} as const;

/** The light labels' face: Inter's optical size for the label's size */
export const labelFont = (size: number) =>
  size >= 32 ? CARD_FONT.inter : CARD_FONT.inter28;

type FontWeight = 400 | 600 | 700 | 800;

type CardFont = Readonly<{
  name: string;
  data: Buffer;
  weight: FontWeight;
  style: 'normal';
}>;

const font = async (
  name: string,
  weight: FontWeight,
  file: Promise<Buffer>,
): Promise<CardFont> => ({ data: await file, name, style: 'normal', weight });

let fonts: Promise<ReadonlyArray<CardFont>> | null = null;

/** Read once per instance */
export function loadCardFonts(): Promise<ReadonlyArray<CardFont>> {
  fonts ??= Promise.all([
    font(
      CARD_FONT.inter,
      400,
      readFile(
        join(
          process.cwd(),
          'src/app/(site)/u/[username]/stats/[year]/_card/fonts/inter-display-latin-400.woff',
        ),
      ),
    ),
    font(
      CARD_FONT.inter28,
      400,
      readFile(
        join(
          process.cwd(),
          'src/app/(site)/u/[username]/stats/[year]/_card/fonts/inter-opsz28-latin-400.woff',
        ),
      ),
    ),
    font(
      CARD_FONT.inter,
      600,
      readFile(
        join(
          process.cwd(),
          'src/app/(site)/u/[username]/stats/[year]/_card/fonts/inter-display-latin-600.woff',
        ),
      ),
    ),
    font(
      CARD_FONT.inter,
      700,
      readFile(
        join(
          process.cwd(),
          'src/app/(site)/u/[username]/stats/[year]/_card/fonts/inter-display-latin-700.woff',
        ),
      ),
    ),
    font(
      CARD_FONT.inter,
      800,
      readFile(
        join(
          process.cwd(),
          'src/app/(site)/u/[username]/stats/[year]/_card/fonts/inter-display-latin-800.woff',
        ),
      ),
    ),
    font(
      CARD_FONT.jakarta,
      800,
      readFile(
        join(
          process.cwd(),
          'src/app/(site)/u/[username]/stats/[year]/_card/fonts/plus-jakarta-sans-latin-800.woff',
        ),
      ),
    ),
  ]).catch((error: unknown) => {
    fonts = null;
    throw error;
  });
  return fonts;
}
