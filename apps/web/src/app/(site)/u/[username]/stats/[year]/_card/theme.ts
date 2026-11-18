/**
 * The share card's two themes.
 * Dark is the page's ground with a faint blue glow top right. Colour is the
 * year's #1 show's `backdropColor` (the API serves it readable under white
 * text), running down to darker steps of itself as a gradient
 * (#1a74b6 → #145b8f → #0b2f4b: 78.5% and 40.94% of the top colour, the
 * factors that give exactly those steps).
 */

import { channelsToHex, hexChannels, type Rgb } from '@tvseri.es/utils';

export type CardTheme = 'dark' | 'colour';

export const CARD_THEMES: ReadonlyArray<CardTheme> = ['dark', 'colour'];

/** The Colour ground, when the #1 show has no colour of its own */
const FALLBACK_COLOUR = '#1a74b6';

/** The Dark ground, also the Dark swatch */
export const DARK_GROUND = '#161b1c';

/** The gradient's 45% and 100% steps, as fractions of the top colour */
const MIDDLE = 0.785;
const BOTTOM = 0.4094;

const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

/** `#1a74b6`, `1a74b6` or `#17b` → its channels; null for anything else */
export function parseHex(value: string | null | undefined): Rgb | null {
  const match = value ? HEX.exec(value.trim()) : null;
  const digits = match?.[1];
  if (!digits) {
    return null;
  }
  return hexChannels(
    `#${digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits}`,
  );
}

const scale = (rgb: Rgb, factor: number): Rgb =>
  rgb.map((channel) => channel * factor) as unknown as Rgb;

/** The #1 show's colour, or the default blue when there is none */
export function cardColour(value: string | null | undefined): string {
  return channelsToHex(parseHex(value) ?? parseHex(FALLBACK_COLOUR)!);
}

/** What the card draws differently per theme */
export type ThemeStyle = Readonly<{
  backgroundColor: string;
  backgroundImage: string;
  /** Labels and the streak line */
  soft: string;
  /** The streak bracket */
  bracket: string;
}>;

/** The card's ground and soft colours; `colour` is the #1 show's colour */
export function themeStyle(
  theme: CardTheme,
  colour: string | null,
): ThemeStyle {
  if (theme === 'dark') {
    return {
      backgroundColor: DARK_GROUND,
      backgroundImage:
        'radial-gradient(70% 55% at 85% 12%, rgba(32,142,223,0.2), rgba(32,142,223,0) 70%)',
      bracket: 'rgba(255,255,255,0.3)',
      soft: 'rgba(255,255,255,0.68)',
    };
  }
  const top = cardColour(colour);
  const rgb = parseHex(top)!;
  const middle = channelsToHex(scale(rgb, MIDDLE));
  const bottom = channelsToHex(scale(rgb, BOTTOM));
  return {
    backgroundColor: bottom,
    backgroundImage: `linear-gradient(170deg, ${top} 0%, ${middle} 45%, ${bottom} 100%)`,
    bracket: 'rgba(255,255,255,0.5)',
    soft: 'rgba(255,255,255,0.85)',
  };
}
