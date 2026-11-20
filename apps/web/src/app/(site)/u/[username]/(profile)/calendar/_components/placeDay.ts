import { placeArrowed, type Rect } from '@/components/ui/popover/place';

/** Between the cell and the popover's edge (its arrow sits in it) */
const GAP = 10;
/** The arrow's centre stays this far from the panel's sides: clear of its 26px corners */
const ARROW_INSET = 36;

/** An element's offset inside an ancestor, transforms left out */
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
 * The cell's box in the viewport where it lands, not where a sliding grid
 * has it now: from ‹ › into another month the popover is placed at once,
 * while the grid still slides in.
 */
function cellRect(cell: HTMLElement, stage: HTMLElement): Rect {
  const box = stage.getBoundingClientRect();
  const { x, y } = offsetIn(cell, stage);
  const left = box.left + x;
  const top = box.top + y;
  return {
    bottom: top + cell.offsetHeight,
    left,
    right: left + cell.offsetWidth,
    top,
  };
}

/**
 * The panel's height with its tickets uncapped by us (up to their own
 * max-height), read without lifting the cap: lifting it would reset a
 * scrolled list.
 */
function naturalHeight(panel: HTMLElement) {
  const list = panel.querySelector<HTMLElement>('[data-day-tickets]');
  if (!list) {
    return panel.offsetHeight;
  }
  const own = Number.parseFloat(getComputedStyle(list).maxHeight);
  const full = Number.isFinite(own)
    ? Math.min(list.scrollHeight, own)
    : list.scrollHeight;
  return panel.offsetHeight - list.clientHeight + full;
}

/**
 * Places a day's popover against the viewport on its cell (`placeArrowed`)
 * and writes it: position, the cap that shortens the tickets when neither
 * side has the room, the arrow (`--arrow`, `data-side`) and the grow's
 * origin at the arrow. Offset sizes, not boxes: the panel grows from 0.96.
 */
export function placeDay(
  panel: HTMLElement,
  cell: HTMLElement,
  stage: HTMLElement,
) {
  const place = placeArrowed({
    anchor: cellRect(cell, stage),
    arrowInset: ARROW_INSET,
    gap: GAP,
    panel: { height: naturalHeight(panel), width: panel.offsetWidth },
    viewport: {
      height: window.innerHeight,
      width: document.documentElement.clientWidth,
    },
  });
  const below = place.side === 'below';
  panel.style.left = `${place.left}px`;
  panel.style.top = `${place.top}px`;
  panel.style.maxHeight =
    place.maxHeight === null ? '' : `${place.maxHeight}px`;
  panel.style.setProperty('--arrow', `${place.arrow}px`);
  panel.style.transformOrigin = `${place.arrow}px ${below ? '0' : '100%'}`;
  panel.dataset.side = place.side;
  return place.side;
}
