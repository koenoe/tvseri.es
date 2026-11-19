import type { PopoverPlace } from './DayPopover';

/** The popover's width and how close it may come to the stage's sides */
const WIDTH = 448;
const MARGIN = 12;
/** Between the cell and the popover's edge (its arrow sits in it) */
const GAP = 10;
/** The last two of the six weeks open above their cell */
const FIRST_ROW_ABOVE = 4;

/** An element's offset inside an ancestor, transforms left out (a sliding grid lands here) */
function offsetIn(element: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: Element | null = element;
  while (node instanceof HTMLElement && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return { x, y };
}

/**
 * Where a day's popover goes in the calendar's stage: under its cell (above
 * it in the last two weeks), clamped inside the stage, the arrow on the
 * cell's centre. `index` is the cell's place in the 42 days.
 */
export function placePopover(
  cell: HTMLElement,
  stage: HTMLElement,
  index: number,
): PopoverPlace {
  const { x, y } = offsetIn(cell, stage);
  const centre = x + cell.offsetWidth / 2;
  const left = Math.max(
    MARGIN,
    Math.min(stage.offsetWidth - WIDTH - MARGIN, centre - WIDTH / 2),
  );
  const below = Math.floor(index / 7) < FIRST_ROW_ABOVE;
  return {
    arrow: centre - left,
    below,
    edge: below ? y + cell.offsetHeight + GAP : stage.offsetHeight - y + GAP,
    left,
  };
}
