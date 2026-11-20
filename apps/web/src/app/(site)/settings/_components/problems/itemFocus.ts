import { flushSync } from 'react-dom';

import { FOCUSABLE } from '@/lib/a11y/focusable';

/** A review item's frame (`ProblemItemFrame`) */
const ITEM_FRAME = '[data-problem-item]';
/** A group's open list of items, and the group around it (`ProblemGroup`) */
const ITEM_LIST = '[data-problem-list]';
const GROUP = '[data-problem-group]';

const itemsIn = (list: Element) =>
  Array.from(list.querySelectorAll(ITEM_FRAME));

/**
 * The first control in the items from `index` on, else the group's
 * header: an item with nothing left to press (a pick already sent) is
 * passed over
 */
function focusFromItem(list: Element, index: number) {
  for (const item of itemsIn(list).slice(index)) {
    const control = item.querySelector<HTMLElement>(FOCUSABLE);
    if (control) {
      control.focus();
      return;
    }
  }
  list
    .closest(GROUP)
    ?.querySelector<HTMLElement>('button[aria-expanded]')
    ?.focus();
}

/**
 * Runs a press in a review item (Skip, a pick, Undo). When it swaps away
 * the control that had focus (the buttons become "Skipped · Undo", Undo
 * brings them back), focus would fall to the page: it goes to the first
 * control the item now has instead. Focus already moved on (Connected apps
 * hands it to the next item) is left alone.
 */
export function keepFocusInItem(press: () => void) {
  const pressed = document.activeElement;
  const frame = pressed?.closest(ITEM_FRAME);
  flushSync(press);
  if (
    !frame ||
    pressed?.isConnected ||
    document.activeElement !== document.body
  ) {
    return;
  }
  frame.querySelector<HTMLElement>(FOCUSABLE)?.focus();
}

/**
 * Focus left on the page when an item's last control went by itself (Undo
 * once its pick is sent): it goes on to the next item that has one, else
 * the group's header
 */
export function focusPastItem(inside: Element) {
  const frame = inside.closest(ITEM_FRAME);
  const list = frame?.closest(ITEM_LIST);
  if (!frame || !list || document.activeElement !== document.body) {
    return;
  }
  focusFromItem(list, itemsIn(list).indexOf(frame) + 1);
}

/**
 * Runs Show them: the summed-up rest (the pressed control's own item)
 * gives way to its items, and focus goes to the first of them, where the
 * rest stood
 */
export function showRestOfItems(show: () => void) {
  const frame = document.activeElement?.closest(ITEM_FRAME);
  const list = frame?.closest(ITEM_LIST);
  const place = list && frame ? itemsIn(list).indexOf(frame) : -1;
  flushSync(show);
  if (list && place >= 0 && document.activeElement === document.body) {
    focusFromItem(list, place);
  }
}
