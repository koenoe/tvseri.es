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
 * (globals.css `remote-surface`, specs/remote_style.md §2).
 */
export function mixWithWhite(ink: string, share: number): string {
  return channelsToHex(
    mapRgb(hexChannels(ink), (value) => value * share + 255 * (1 - share)),
  );
}

const readable = (ink: string) => {
  const key = mixWithWhite(ink, 0.06);
  return (
    // --rk-w64 on white: chip letters, hints, meta on the sheet
    contrast(mixWithWhite(ink, 0.64), '#ffffff') >= 4.5 &&
    // --rk-meta on --rk-key: big-key meta and reasons
    contrast(mixWithWhite(ink, 0.72), key) >= 4.5 &&
    // --rk-mark: the focus ring, non-text
    contrast(mixWithWhite(ink, 0.52), '#ffffff') >= 3
  );
};

/**
 * The ink of the white remote surface (search and the Remote): the page or
 * tile colour, darkened (mixed with black in 4% steps, so the hue stays)
 * until its lightest steps pass WCAG AA on white and on a key: meta and chip
 * letters 4.5:1, the focus ring 3:1 (remote_style.md §11: "mix more ink if
 * not"). Dark page colours pass unchanged. Anything that isn't a six-digit
 * hex becomes the ground.
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
