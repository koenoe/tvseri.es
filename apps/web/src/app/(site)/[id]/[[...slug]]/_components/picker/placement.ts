/**
 * Over the open sheet a dialog sits on the sheet, 20px in and 200px down;
 * otherwise centred; a bottom sheet on phones.
 */
export const OVER_SHEET = 'sm:mt-50 sm:mr-5 sm:self-start sm:justify-self-end';

/** The row-anchored dialog's box: 560px wide, 541px tall as built. */
const DIALOG = { height: 544, width: 560 } as const;
const MARGIN = 16;

type Point = Readonly<{ left: number; top: number }>;

/**
 * Opened from the season line (Enter), "I'm up to…" sits under the line,
 * 130px below the season header's top and 440px in (`atRow`),
 * kept inside the viewport.
 */
export function rowPlacement(
  header: Point,
  viewport: Readonly<{ height: number; width: number }>,
): Point {
  const clamp = (value: number, max: number) =>
    Math.max(MARGIN, Math.min(value, max));
  return {
    left: clamp(header.left + 440, viewport.width - MARGIN - DIALOG.width),
    top: clamp(header.top + 130, viewport.height - MARGIN - DIALOG.height),
  };
}

/** Desktop: the panel at the `--ut-top` / `--ut-left` its wrapper sets. */
export const AT_ROW =
  'sm:mt-(--ut-top) sm:ml-(--ut-left) sm:self-start sm:justify-self-start';
