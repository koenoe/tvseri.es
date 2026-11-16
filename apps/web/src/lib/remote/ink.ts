import { contrast, toPageColor } from '@/components/background/pageColor';
import { channelsToHex, hexChannels, type Rgb } from '@/lib/color';

export { contrast };

const mapRgb = (rgb: Rgb, map: (value: number) => number): Rgb => [
  map(rgb[0]),
  map(rgb[1]),
  map(rgb[2]),
];

/**
 * `color-mix(in srgb, <ink> <share>, #fff)`: how the remote steps are made
 * (globals.css `remote-surface`).
 */
export function mixWithWhite(ink: string, share: number): string {
  return channelsToHex(
    mapRgb(hexChannels(ink), (value) => value * share + 255 * (1 - share)),
  );
}

/**
 * How dark the ink must be. The text on the surface no longer uses the ink
 * (it is the fixed --rk-text), but the darkening keeps the yardstick it was
 * signed off with, so the fills stay as they were: the ink's 64% and 72%
 * steps at 4.5:1 on white and on a key, which also puts a latched key's
 * white label well above 4.5:1.
 */
const readable = (ink: string) => {
  const key = mixWithWhite(ink, 0.06);
  return (
    contrast(mixWithWhite(ink, 0.64), '#ffffff') >= 4.5 &&
    contrast(mixWithWhite(ink, 0.72), key) >= 4.5 &&
    // --rk-mark: the focus ring, non-text
    contrast(mixWithWhite(ink, 0.52), '#ffffff') >= 3
  );
};

/**
 * The ink of the white remote surface (search and the Remote), which tints
 * its fills only (keys, lines, the latched key, the focus ring): the page or
 * tile colour, darkened (mixed with black in 4% steps, so the hue stays)
 * until the focus ring passes 3:1 on white and a latched key's white label
 * 4.5:1 (remote_style.md §11: "mix more ink if not"). Dark page colours pass
 * unchanged. Anything that isn't a six-digit hex becomes the ground.
 */
export function remoteInk(color: unknown): string {
  const base = hexChannels(toPageColor(color));
  for (let black = 0; black <= 1; black += 0.04) {
    const ink = channelsToHex(mapRgb(base, (value) => value * (1 - black)));
    if (readable(ink)) {
      return ink;
    }
  }
  return '#000000';
}
