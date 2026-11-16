/**
 * A network landing's colour (one wash): the page's ground, one
 * large radial wash that fades fully into the page from the top left (no box,
 * no edge), and whether the logo keeps its own colours. A monochrome logo
 * (HBO, Apple TV) is drawn white on a white wash; only a coloured logo
 * (Netflix red) gives the wash its colour.
 */

import { channelsToHex, hexChannels } from '@/lib/color';

type Brand = Readonly<{
  /** the logo's colour, six-digit hex; none for a monochrome logo */
  colour?: string;
  /** the page's ground, when the design picks one */
  ground?: string;
  /** the wash's strength at its centre (white .08, a colour .30) */
  strength?: number;
}>;

/**
 * Networks whose TMDB logo is in colour, and the grounds the design draws.
 * Every other network has a monochrome logo, made white.
 * DRAFT: owner approves (which logos keep their colour).
 */
const BRANDS: Readonly<Record<string, Brand>> = {
  'apple-tv': { ground: '#121214', strength: 0.07 },
  crunchyroll: { colour: '#f47521' },
  hbo: { ground: '#0e0e10' },
  hulu: { colour: '#1ce783' },
  netflix: { colour: '#e50914', ground: '#110c0d' },
  nickelodeon: { colour: '#ff6600' },
  'paramount-plus': { colour: '#0064ff' },
};

/** The ground of a network the design doesn't draw (HBO's) */
export const DEFAULT_GROUND = '#0e0e10';

const WHITE = '#ffffff';
const WHITE_STRENGTH = 0.08;
const COLOUR_STRENGTH = 0.3;
/** How much of a logo's colour tints the ground of a network the design doesn't draw */
const GROUND_TINT = 0.04;

export type NetworkLook = Readonly<{
  ground: string;
  /** the logo is drawn in its own colours (else white) */
  keepLogo: boolean;
  /** CSS backgrounds: desktop and phone */
  wash: Readonly<{ desktop: string; phone: string }>;
}>;

/** `base` with `amount` (0 to 1) of `colour` mixed in, six-digit hex */
export function mixHex(base: string, colour: string, amount: number): string {
  const [r, g, b] = hexChannels(base);
  const [toR, toG, toB] = hexChannels(colour);
  return channelsToHex([
    r + (toR - r) * amount,
    g + (toG - g) * amount,
    b + (toB - b) * amount,
  ]);
}

const strengthText = (value: number) =>
  String(Number(value.toFixed(2))).replace(/^0\./, '.');

/** `radial-gradient(1200px 820px at 8% 0%,rgba(255,255,255,.08),rgba(255,255,255,0) 72%)` */
function radialWash(
  colour: string,
  strength: number,
  size: string,
  at: string,
): string {
  const rgb = hexChannels(colour).join(',');
  return `radial-gradient(${size} at ${at},rgba(${rgb},${strengthText(strength)}),rgba(${rgb},0) 72%)`;
}

/**
 * The look of `/network/{slug}`. Desktop's wash is 1200 × 820 (a colour's
 * 1300 × 900) from 8% across the top; the phone's 420 × 360 from 10%.
 */
export function networkLook(slug: string): NetworkLook {
  const brand = BRANDS[slug] ?? {};
  const colour = brand.colour ?? WHITE;
  const strength =
    brand.strength ?? (brand.colour ? COLOUR_STRENGTH : WHITE_STRENGTH);
  const ground =
    brand.ground ??
    (brand.colour
      ? mixHex(DEFAULT_GROUND, brand.colour, GROUND_TINT)
      : DEFAULT_GROUND);
  const desktopSize = brand.colour ? '1300px 900px' : '1200px 820px';
  return {
    ground,
    keepLogo: Boolean(brand.colour),
    wash: {
      desktop: radialWash(colour, strength, desktopSize, '8% 0%'),
      phone: radialWash(colour, strength, '420px 360px', '10% 0%'),
    },
  };
}
