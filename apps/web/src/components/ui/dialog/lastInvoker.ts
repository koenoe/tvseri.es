/**
 * The control that was just clicked or tapped. Safari doesn't focus a button
 * on click, so when a dialog opens `document.activeElement` is the body and
 * can't say where focus belongs after it closes.
 */
const FRESH_MS = 2000;

let invoker: { at: number; element: HTMLElement } | null = null;

const INTERACTIVE = 'button, a[href], summary, [role="button"], [tabindex]';

function remember(event: MouseEvent) {
  const target = event.target;
  const element =
    target instanceof Element ? target.closest<HTMLElement>(INTERACTIVE) : null;
  invoker = element ? { at: Date.now(), element } : null;
}

if (typeof document !== 'undefined') {
  // Capture phase: runs before the handler that opens the dialog.
  document.addEventListener('click', remember, { capture: true });
}

/** Where focus returns to once a dialog closes: the focused element, else the control just clicked. */
export function dialogOpener(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    return active;
  }
  return invoker && Date.now() - invoker.at < FRESH_MS ? invoker.element : null;
}
