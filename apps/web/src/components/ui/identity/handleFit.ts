/**
 * Plus Jakarta Sans 800's advance widths (em) for a username's alphabet
 * (lowercase letters, digits and hyphens: `UsernameSchema`), measured in
 * the browser with the page's own font. Anything else counts as an "m".
 */
const ADVANCE: Readonly<Record<string, number>> = {
  '-': 0.634,
  0: 0.7,
  1: 0.413,
  2: 0.596,
  3: 0.612,
  4: 0.662,
  5: 0.614,
  6: 0.604,
  7: 0.564,
  8: 0.633,
  9: 0.604,
  a: 0.583,
  b: 0.673,
  c: 0.611,
  d: 0.673,
  e: 0.611,
  f: 0.41,
  g: 0.648,
  h: 0.599,
  i: 0.26,
  j: 0.26,
  k: 0.586,
  l: 0.26,
  m: 0.929,
  n: 0.599,
  o: 0.651,
  p: 0.673,
  q: 0.673,
  r: 0.386,
  s: 0.515,
  t: 0.421,
  u: 0.599,
  v: 0.582,
  w: 0.912,
  x: 0.582,
  y: 0.602,
  z: 0.492,
};

/** The handle's −0.03em tracking, per character */
const TRACKING = -0.03;
/** The "@"'s advance in em of its own size (Jakarta 600: 0.926em; 800 a little wider) */
const AT_ADVANCE = 0.96;
const WIDEST = ADVANCE.m ?? 0.929;

/**
 * How wide "@name" is in em of the handle's font size (the 2px after the
 * "@" aside), so the size can be fitted to the column exactly: a rule that
 * assumes an average letter puts a handle full of m's and w's onto a second
 * line. `at` is the "@"'s size in em
 * of the handle (0.6 in the sidebar, 0.75 in the compact identity).
 */
export function handleEm(username: string, at = 0.6): number {
  let em = at * (at === 0.6 ? 0.926 : AT_ADVANCE);
  for (const character of username) {
    em += (ADVANCE[character] ?? WIDEST) + TRACKING;
  }
  return Number(em.toFixed(3));
}

/**
 * The handle's font size fitted to its container (`100cqw`), from `max`
 * down to `min`. The floors hold every handle `generateUsername` makes
 * (two words and a number, at most 25 characters: "honorable-hummingbird-
 * 000" is 14.7em) on one line: 20px in the 300px sidebar, 16px beside the
 * phone's Follow pill. A longer chosen handle still ends in an ellipsis.
 */
export function handleFontSize(
  username: string,
  { at = 0.6, max, min }: Readonly<{ at?: number; max: number; min: number }>,
): string {
  const em = handleEm(username, at);
  return `clamp(${min}px, calc((100cqw - 2px) / ${em}), ${max}px)`;
}
