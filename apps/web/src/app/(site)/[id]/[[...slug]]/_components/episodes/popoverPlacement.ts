import { fitVertically, type VerticalFit } from '@/components/ui/popover/place';

/** Space kept between the trigger and the popover. */
export const POPOVER_GAP = 8;
/** The popover's own cap (max-height). */
const POPOVER_MAX = 600;

/**
 * Where the desktop season popover opens so it stays in the window: the
 * shared rule (`fitVertically`) with its own gap and cap, the list
 * scrolling inside (`max-height` + `overflow-y: auto`). Pure: the caller
 * measures.
 */
export function placePopover({
  natural,
  triggerBottom,
  triggerTop,
  viewport,
}: Readonly<{
  /** The popover's height as drawn (already capped at `POPOVER_MAX`). */
  natural: number;
  triggerTop: number;
  triggerBottom: number;
  viewport: number;
}>): VerticalFit {
  return fitVertically({
    anchorBottom: triggerBottom,
    anchorTop: triggerTop,
    gap: POPOVER_GAP,
    natural: Math.min(natural, POPOVER_MAX),
    viewport,
  });
}

/** Scrolls `row` to the middle of `list` (the list alone, never the page). */
export function centreRow(list: HTMLElement, row: HTMLElement): void {
  list.scrollTop = Math.max(
    0,
    row.offsetTop - (list.clientHeight - row.offsetHeight) / 2,
  );
}

/**
 * Keeps `row` inside `list`'s visible part by scrolling the list only:
 * `scrollIntoView` would also scroll the page.
 */
export function keepRowInView(list: HTMLElement, row: HTMLElement): void {
  const top = row.offsetTop;
  const bottom = top + row.offsetHeight;
  if (top < list.scrollTop) {
    list.scrollTop = top;
  } else if (bottom > list.scrollTop + list.clientHeight) {
    list.scrollTop = bottom - list.clientHeight;
  }
}
