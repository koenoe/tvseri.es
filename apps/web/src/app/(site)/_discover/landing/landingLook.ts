/**
 * A landing's ground and glow, from its lead show's colour, so no two
 * landings share one background. The genre landing draws a warm dark (`#1c1916`, about 10%
 * lightness) with one glow that fades out on every side (`rgb(196 120 64 /
 * .16)`, about 51% lightness): the build keeps those lightnesses and takes
 * the hue (and a capped saturation) from the lead show's backdrop colour, so
 * every landing is its own and white text stays readable. A colour already
 * darker than that keeps its own lightness: the ground is never lighter
 * than the show's colour. The same colour always gives the same look;
 * without one, the fallback.
 */

import {
  channelsToHex,
  hexChannels,
  isKnownColor,
  type Rgb,
} from '@tvseri.es/utils';

export type LandingLook = Readonly<{
  /** six-digit hex, the page colour */
  ground: string;
  /** a CSS background for `LandingHero`'s glow, when the landing draws one */
  glow?: string;
}>;

/** The hero's glow in one colour (`r g b`): from the top left, fading out on every side */
const glowOf = (rgb: string) =>
  `radial-gradient(ellipse 70% 90% at 15% 0%, rgb(${rgb} / 0.16), rgb(${rgb} / 0) 60%)`;

/** The genre's warm dark and its one warm glow */
export const GENRE_FALLBACK: LandingLook = {
  glow: glowOf('196 120 64'),
  ground: '#1c1916',
};

const GROUND_LIGHTNESS = 0.1;
const GROUND_MAX_SATURATION = 0.35;
const GLOW_LIGHTNESS = 0.51;
const GLOW_MAX_SATURATION = 0.55;

type Hsl = readonly [hue: number, saturation: number, lightness: number];

const toHsl = (hex: string): Hsl => {
  const [red, green, blue] = hexChannels(hex);
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return [0, 0, lightness];
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === r
      ? ((g - b) / delta + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / delta + 2) * 60
        : ((r - g) / delta + 4) * 60;
  return [hue, saturation, lightness];
};

const toRgb = ([hue, saturation, lightness]: Hsl): Rgb => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [r, g, b] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return [r + m, g + m, b + m].map((part) => Math.round(part * 255)) as [
    number,
    number,
    number,
  ];
};

/** Below this saturation a colour is a grey: every grey gives the same ground */
const TINTED = 0.12;

/**
 * The colour to build a landing's look from, given its candidates' colours
 * in order (the lead show first): the first with a hue, else the first
 * known one (a grey), else null. Greys would give every landing led by a
 * monochrome backdrop the same ground.
 */
export function pickLeadColour(
  colours: ReadonlyArray<string | null | undefined>,
): string | null {
  const found = colours.filter(isKnownColor);
  return found.find((colour) => toHsl(colour)[1] >= TINTED) ?? found[0] ?? null;
}

/** The look for a lead show's colour, or `fallback` when there is none */
export function landingLook(
  colour: string | null | undefined,
  fallback: LandingLook,
): LandingLook {
  if (!isKnownColor(colour)) {
    return fallback;
  }
  const [hue, saturation, lightness] = toHsl(colour);
  // only ever darker than the show's colour: a near-black stays near-black
  const ground = channelsToHex(
    toRgb([
      hue,
      Math.min(saturation, GROUND_MAX_SATURATION),
      Math.min(lightness, GROUND_LIGHTNESS),
    ]),
  );
  if (!fallback.glow) {
    return { ground };
  }
  const rgb = toRgb([
    hue,
    Math.min(saturation, GLOW_MAX_SATURATION),
    GLOW_LIGHTNESS,
  ]).join(' ');
  return { glow: glowOf(rgb), ground };
}
