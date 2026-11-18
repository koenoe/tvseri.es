/**
 * Swipe-down-to-close for the phone's bottom sheets, on Vaul's numbers
 * (emilkowalski/vaul, `src/constants.ts` and `src/helpers.ts`): the sheet
 * settles back, or leaves, in 500 ms on `cubic-bezier(.32,.72,0,1)`; a
 * release closes it past a quarter of its height or on a flick faster than
 * 0.4 px/ms (the swipe's average speed); a drag above where it started is
 * rubber-banded.
 */

export const SHEET_SETTLE = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1],
} as const;

const CLOSE_THRESHOLD = 0.25;
const VELOCITY_THRESHOLD = 0.4;

/**
 * Where the sheet sits for a drag of `dy` px (down is positive): 1:1 down,
 * Vaul's logarithmic damping up (nothing for the first 6px, then slower and
 * slower).
 */
export function sheetOffset(dy: number): number {
  if (dy >= 0) {
    return dy;
  }
  return -Math.max(0, 8 * (Math.log(-dy + 1) - 2));
}

/** How much of the dim stays at an offset: it fades with the drag. */
export function dimAt(offset: number, height: number): number {
  if (height <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, 1 - offset / height));
}

/** Whether a release closes the sheet, or it settles back. */
export function closesSheet({
  dy,
  elapsedMs,
  height,
}: Readonly<{ dy: number; elapsedMs: number; height: number }>): boolean {
  if (dy <= 0) {
    return false;
  }
  return (
    dy / Math.max(1, elapsedMs) > VELOCITY_THRESHOLD ||
    dy >= height * CLOSE_THRESHOLD
  );
}

/**
 * Whether a downward swipe that started on `target` may move the sheet:
 * not from a dialog opened over it (React bubbles its events up here), a
 * `<select>` or a part with its own drag (`data-no-sheet-swipe`), and not
 * while a list between the finger and the panel is scrolled down (then the
 * swipe scrolls it back up, as in Vaul).
 */
export function swipeMovesSheet(
  target: EventTarget | null,
  panel: Element,
): boolean {
  if (
    !(target instanceof Element) ||
    !panel.contains(target) ||
    target.closest('dialog') !== panel.parentElement
  ) {
    return false;
  }
  if (target.closest('select, [data-no-sheet-swipe]')) {
    return false;
  }
  for (
    let element: Element | null = target;
    element && element !== panel.parentElement;
    element = element.parentElement
  ) {
    if (element.scrollTop > 0) {
      return false;
    }
  }
  return true;
}
