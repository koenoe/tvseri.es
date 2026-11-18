/**
 * Lists of names that sit on one line ("Billions, Barry, The Pitt and 30
 * more", "With Tom Hardy, Helen Mirren and Pierce Brosnan"). The line is built
 * from the names that fit, so the phrase is complete at any width: a CSS
 * clamp can only cut text off, and it cuts through "and N more". The text is
 * computed on the server from an estimate (no measuring, no layout work in
 * the browser), so the server and the client render the same string.
 */

import { formatGrouped } from '@tvseri.es/utils';

/** Inter at 12px, in px per character class (estimates, rounded up a little) */
const CHAR_PX_AT_12 = {
  digit: 7.2,
  lower: 6.6,
  narrow: 3.4,
  other: 7,
  space: 3.4,
  upper: 8.2,
};

const charPx = (char: string) =>
  char === ' '
    ? CHAR_PX_AT_12.space
    : /[.,:;'’!|il]/.test(char)
      ? CHAR_PX_AT_12.narrow
      : /\d/.test(char)
        ? CHAR_PX_AT_12.digit
        : /[a-z]/.test(char)
          ? CHAR_PX_AT_12.lower
          : /[A-Z]/.test(char)
            ? CHAR_PX_AT_12.upper
            : CHAR_PX_AT_12.other;

/** A line's estimated width in px at a font size (Inter) */
export const textWidth = (text: string, fontPx = 12): number =>
  ([...text].reduce((sum, char) => sum + charPx(char), 0) * fontPx) / 12;

/**
 * The longest start of `names` whose line (`build(shown)`) fits `maxWidth`,
 * never fewer than one name. `build` says how the line reads for a given
 * start of the list, so it can end in "and N more" worked out from what it
 * shows.
 */
export function fitNames(
  names: ReadonlyArray<string>,
  build: (shown: ReadonlyArray<string>) => string,
  { fontPx = 12, maxWidth }: Readonly<{ fontPx?: number; maxWidth: number }>,
): string {
  for (let shown = names.length; shown > 1; shown--) {
    const line = build(names.slice(0, shown));
    if (textWidth(line, fontPx) <= maxWidth) {
      return line;
    }
  }
  return build(names.slice(0, 1));
}

/** "A", "A and B", "A, B and C" */
export function joinAnd(names: ReadonlyArray<string>): string {
  const last = names.at(-1) ?? '';
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')} and ${last}`
    : last;
}

/** "A, B and 30 more" when names are left out, else "A, B" */
export function withMore(shown: ReadonlyArray<string>, total: number): string {
  const names = shown.join(', ');
  const more = total - shown.length;
  return more > 0 ? `${names} and ${formatGrouped(more)} more` : names;
}
