import { isHexColor } from '@tvseri.es/schemas';
/**
 * The rule every page colour the API serves follows (a series'
 * `backdropColor`, an admin's pick, a detected dominant colour): it is
 * usable as a page ground under white text.
 *
 * - The quietest text drawn straight on a ground is the meta line, white at
 *   60%. White at 60% over the colour must read against the colour at
 *   4.5:1 or more (WCAG 2.x contrast, AA for body text).
 * - A colour that passes is served as it is. Every shipped ground passes
 *   (The Bear's `#29251f` is 6.5:1), so colours that were fine never change.
 * - A brighter colour is mixed with black in 4% steps (each channel times
 *   0.96, 0.92, …), so the hue and the saturation stay: a grey stays a
 *   neutral grey, a mustard a darker mustard. The first step that passes is
 *   served. At the latest the last step, black, passes.
 *
 * It is pure and idempotent (a served colour passes, so it comes back
 * unchanged), so it runs on every colour on its way out: a fresh detection,
 * a detection stored under an older rule and an admin's saved pick alike.
 * Nothing stored is rewritten.
 */

import {
  channelsToHex,
  contrastRatio,
  hexChannels,
  type Rgb,
} from '@tvseri.es/utils';

/** White at this opacity is the quietest text on a ground */
const QUIET_TEXT_OPACITY = 0.6;
/** WCAG AA for body text */
const MIN_CONTRAST = 4.5;
/** Share of black mixed in per step */
const STEP = 0.04;
const STEPS = 25;

/** WCAG contrast of white at 60% (composited on `ground`) against `ground` */
export function quietTextContrast(ground: Rgb): number {
  const text = ground.map(
    (channel) => 255 * QUIET_TEXT_OPACITY + channel * (1 - QUIET_TEXT_OPACITY),
  ) as unknown as Rgb;
  return contrastRatio(text, ground);
}

const scale = (rgb: Rgb, share: number): Rgb =>
  rgb.map((channel) => Math.round(channel * share)) as unknown as Rgb;

/**
 * The colour as a page ground under white text (see the rule above), as a
 * lowercase six-digit hex; `undefined` for anything that isn't a six-digit
 * hex colour.
 */
export function groundColor(value: unknown): string | undefined {
  if (!isHexColor(value)) {
    return undefined;
  }
  const base = hexChannels(value);
  for (let step = 0; step <= STEPS; step += 1) {
    const ground = scale(base, 1 - step * STEP);
    if (quietTextContrast(ground) >= MIN_CONTRAST) {
      return channelsToHex(ground);
    }
  }
  return '#000000';
}

/** `groundColor` for a colour that may be missing or malformed: `fallback` then */
export const groundColorOr = (value: unknown, fallback: string): string =>
  groundColor(value) ?? fallback;
