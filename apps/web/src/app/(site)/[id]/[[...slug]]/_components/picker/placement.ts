import { clampToViewport, type Point } from '@/components/ui/dialog/atPoint';

/**
 * Over the open sheet a dialog sits on the sheet, 20px in and 200px down;
 * otherwise centred; a bottom sheet on phones.
 */
export const OVER_SHEET = 'sm:mt-50 sm:mr-5 sm:self-start sm:justify-self-end';

/** The row-anchored dialog's box: 560 × 544. */
const DIALOG = { height: 544, width: 560 } as const;

/**
 * Opened from the season line (Enter), "I'm up to…" sits under the line,
 * 130px below the season header's top and 440px in, kept inside the
 * viewport.
 */
export function rowPlacement(
  header: Point,
  viewport: Readonly<{ height: number; width: number }>,
): Point {
  return clampToViewport(
    { left: header.left + 440, top: header.top + 130 },
    DIALOG,
    viewport,
  );
}
