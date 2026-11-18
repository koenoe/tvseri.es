import hexToRgb from './hexToRgb';

/**
 * The spotlight shade, for every hero whose artwork sits under the header:
 * over the artwork, the hero's colour as
 *
 * - a vignette, `radial-gradient(c/0 0%, c/.7 100%)`, tinting every edge and
 *   corner toward the colour (the header row included), and
 * - a sideways fade from the left, `linear-gradient(270deg, c/0 0%,
 *   c/.4 50%, c/1 100%)` at 70% opacity. The opacity is folded into the
 *   stops (c/.28 at 50%, c/.7 at 100%) so it stays one background list
 *   with no extra layer.
 *
 * Returns the two layers, vignette first, for the end of a hero's own
 * background list: `${lowerBlend}, ${heroShade(color)}` draws the hero's
 * blend into the page on top of the shade. The colour is
 * the API's page colour (readable under white text), a six-digit hex.
 *
 * @example
 * style={{ background: `linear-gradient(0deg, ${color} 6%, rgba(0,0,0,0) 55%), ${heroShade(color)}` }}
 */
export function heroShade(color: string): string {
  const rgb = hexToRgb(color).join(',');
  const at = (alpha: number) => `rgba(${rgb},${alpha})`;
  return [
    `radial-gradient(${at(0)} 0%, ${at(0.7)} 100%)`,
    `linear-gradient(270deg, ${at(0)} 0%, ${at(0.28)} 50%, ${at(0.7)} 100%)`,
  ].join(', ');
}
