/**
 * A bar's height in px: `count` scaled to the busiest bar (`tallest` px), and
 * never under `floor`, so a big bar doesn't flatten the small ones.
 */
export const scaledHeight = (
  count: number,
  busiest: number,
  tallest: number,
  floor: number,
): number => Math.max(floor, Math.round((count / busiest) * tallest));
