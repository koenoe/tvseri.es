/**
 * Focus going back to an overlay's trigger (search, the menu, the ⋯, a
 * dialog) shows the focus ring only when the overlay was opened from the
 * keyboard on that trigger (Tab to it, then Enter, Space or an arrow). Opened
 * by a pointer or a global shortcut, focus still returns (keyboard and screen
 * reader users need it) but quietly: the browser would draw the ring because
 * the closing key (Escape) was a key press. The ring comes back with the
 * next Tab or arrow key, or when focus moves on.
 *
 * Quiet is an attribute the global `:focus-visible` rule skips
 * (globals.css), not `focus({ focusVisible: false })`: Chromium then keeps
 * the ring off through arrow keys too, and WebKit draws it anyway once the
 * Escape key comes up.
 */
const QUIET = 'quietFocus';

/** Keys that open a focused trigger's overlay */
const ACTIVATION_KEYS = new Set([' ', 'ArrowDown', 'ArrowUp', 'Enter']);

/** Keys that bring a quiet ring back on the focused element */
const NAVIGATION_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Tab',
]);

/** The last interaction: a key on an element, or a pointer */
let last: Readonly<{ key: string; target: EventTarget | null }> | null = null;

if (typeof document !== 'undefined') {
  // Capture phase: runs before the handler that opens the overlay.
  document.addEventListener(
    'keydown',
    (event) => {
      last = { key: event.key, target: event.target };
    },
    { capture: true },
  );
  document.addEventListener(
    'pointerdown',
    () => {
      last = null;
    },
    { capture: true },
  );
}

/**
 * Whether the overlay opening now was opened from the keyboard on `trigger`.
 * Call it as the overlay opens; a shortcut typed elsewhere, a click or a tap
 * say no.
 */
export function openedFromKeyboard(
  trigger: Element | null | undefined,
): boolean {
  const target = last?.target;
  return Boolean(
    trigger &&
      last &&
      ACTIVATION_KEYS.has(last.key) &&
      target instanceof Node &&
      trigger.contains(target),
  );
}

/**
 * No ring on `element` until it loses focus or the next Tab or arrow key.
 * For focus the browser puts back itself (a native dialog closing).
 */
export function quietFocus(element: Element | null | undefined): void {
  if (!(element instanceof HTMLElement) || element === document.body) {
    return;
  }
  element.dataset[QUIET] = '';
  const clear = () => {
    delete element.dataset[QUIET];
    element.removeEventListener('blur', clear);
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (event: KeyboardEvent) => {
    if (NAVIGATION_KEYS.has(event.key)) {
      clear();
    }
  };
  element.addEventListener('blur', clear);
  document.addEventListener('keydown', onKey, true);
}

/**
 * Puts focus back on an overlay's trigger as it closes: with the ring when
 * the overlay was opened from the keyboard on it (`openedFromKeyboard`, read
 * as it opened), quietly otherwise.
 */
export function returnFocus(
  element: HTMLElement | null | undefined,
  ring: boolean,
): void {
  if (!element) {
    return;
  }
  if (!ring) {
    quietFocus(element);
  }
  element.focus({ preventScroll: true });
}
