import { CARD_SIZES, type CardFormat } from '../../_card/cardRequest';

/**
 * What the share UI knows about the card, from the server: who and which
 * year, the Colour swatch (the #1 show's colour as the card draws it) and
 * the card in words for the preview's `alt`.
 */
export type ShareCard = Readonly<{
  username: string;
  year: number;
  swatch: string;
  description: string;
}>;

/** "tvseri.es/u/nina/stats/2025": the link field (no scheme, no www) */
export const displayLink = (host: string, path: string) =>
  `${host.replace(/^www\./, '')}${path}`;

/** "1080 × 1080" */
export const sizeLabel = (format: CardFormat) =>
  `${CARD_SIZES[format].width} × ${CARD_SIZES[format].height}`;
