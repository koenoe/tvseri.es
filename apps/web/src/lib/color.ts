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
