/** Space kept between the trigger and the popover, and from the window edge. */
export const POPOVER_GAP = 8;
const POPOVER_EDGE = 16;
/** The popover's own cap (max-height). */
const POPOVER_MAX = 600;

export type PopoverPlacement = Readonly<{
  side: 'below' | 'above';
  /** Px; `null` when the popover fits as it is. */
  maxHeight: number | null;
}>;

/**
 * Where the desktop season popover opens so it stays in the window:
 * under the trigger when it fits there; otherwise on the side with more
 * room, capped to that room, the list scrolling inside
 * (`max-height` + `overflow-y: auto`). Pure: the caller measures.
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
}>): PopoverPlacement {
  const height = Math.min(natural, POPOVER_MAX);
  const below = Math.floor(
    viewport - triggerBottom - POPOVER_GAP - POPOVER_EDGE,
  );
  const above = Math.floor(triggerTop - POPOVER_GAP - POPOVER_EDGE);
  if (height <= below) {
    return { maxHeight: null, side: 'below' };
  }
  if (above > below) {
    return { maxHeight: height <= above ? null : above, side: 'above' };
  }
  return { maxHeight: Math.max(0, below), side: 'below' };
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
 * `scrollIntoView` would also scroll the page (End with the list open did).
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
