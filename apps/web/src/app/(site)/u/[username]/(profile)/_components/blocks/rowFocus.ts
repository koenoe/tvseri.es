import { LEAVING_ITEM } from '@/components/motion/LeavingItem';
import { FOCUSABLE } from '@/lib/a11y/focusable';

/** Marks a lane's rows (`CappedRows`), so focus can find the next one */
export const LANE_ROWS = 'data-lane-rows';

/** The controls Tab reaches in a row (a poster link sits out of the order) */
const controlsIn = (row: Element) =>
  Array.from(row.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (control) => control.tabIndex >= 0,
  );

/**
 * Focuses a lane's heading: where focus goes once the control it was on is
 * gone with nothing after it (the last row answered, Hide all). Programmatic
 * only (`tabindex="-1"`), so Tab never stops there.
 */
export function focusLaneHeading(heading: HTMLElement | null) {
  if (!heading) {
    return;
  }
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
  }
  heading.focus({ preventScroll: true });
}

/** The heading of the lane (`Lane`'s labelled section) an element is in */
function headingOf(element: Element): HTMLElement | null {
  const id = element
    .closest('section[aria-labelledby]')
    ?.getAttribute('aria-labelledby');
  return id ? document.getElementById(id) : null;
}

/**
 * A row that has started leaving (inert, so focus in it would fall to the
 * page): focus held in it moves to the same control in the next row still
 * here (by its place among the row's controls, or the first), else to the
 * lane's heading. Keyboard answers walk down the lane as a press does.
 */
export function handOverToNextRow(leaving: HTMLElement) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !leaving.contains(active)) {
    return;
  }
  const place = controlsIn(leaving).indexOf(active);
  const rows = leaving
    .closest(`[${LANE_ROWS}]`)
    ?.querySelectorAll(`[${LEAVING_ITEM}]:not([inert])`);
  const next = Array.from(rows ?? []).find(
    (row) =>
      leaving.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const targets = next ? controlsIn(next) : [];
  const target = targets[place] ?? targets[0];
  if (target) {
    target.focus({ preventScroll: true });
    return;
  }
  focusLaneHeading(headingOf(leaving));
}
