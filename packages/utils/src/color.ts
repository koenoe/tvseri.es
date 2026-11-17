/** A colour's red, green and blue channels, 0–255 */
export type Rgb = readonly [number, number, number];

/**
 * `#1c2223` → `[28, 34, 35]`. Expects a six-digit hex: validate a colour
 * from outside first (`toPageColor`).
 */
export function hexChannels(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** `[28, 34, 35]` → `#1c2223`; each channel is rounded */
export function channelsToHex(rgb: Rgb): string {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

/** `#121813` at 0.5 → `rgb(18 24 19 / 0.5)` */
export function hexWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexChannels(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

/**
 * The colour the API serves when it knows none: a show's `backdropColor`
 * before detection or on a list item, a watch provider without a predefined
 * or detected colour. Readers treat it as "unknown", not as black.
 */
export const UNKNOWN_COLOR = '#000000';

/** One sRGB channel (0–255) as linear light (IEC 61966-2-1) */
const linear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white) */
export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** WCAG contrast ratio of two colours, 1 to 21, in either order */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
