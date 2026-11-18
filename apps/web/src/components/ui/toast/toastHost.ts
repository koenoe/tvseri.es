import { getTopLayer, subscribeLayers } from '@/components/ui/layer/topLayer';

let host: HTMLDivElement | null = null;

/**
 * Where the host belongs: the topmost open modal dialog, or <body>. A layer
 * that is no longer an open, shown dialog (closing, or in a hidden route) is
 * skipped, so a toast never lands somewhere it can't be seen.
 */
function targetOf(): HTMLElement {
  const layer = getTopLayer();
  return layer?.isConnected &&
    (!(layer instanceof HTMLDialogElement) || layer.open)
    ? layer
    : document.body;
}

/**
 * Moving the host re-inserts its toasts, which would replay their 8px rise:
 * the toast would hop when the sheet it was fired from closes. Transitions
 * are off for the move (`[data-toast-moving]` in globals.css), for two
 * frames, so the toast stays exactly where it is.
 */
const place = () => {
  if (!host) {
    return;
  }
  const target = targetOf();
  if (host.parentElement === target) {
    return;
  }
  const moving = host;
  moving.dataset.toastMoving = '';
  target.append(moving);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      delete moving.dataset.toastMoving;
    }),
  );
};

/**
 * The element the toaster renders into. It lives at the end of <body> and
 * moves into the topmost open modal dialog while one is open, so a toast
 * fired from a sheet (paint, Undo) shows above it and can be clicked: a
 * modal dialog makes everything outside it inert. Moving the node keeps the
 * toast's state; React's portal doesn't mind where its container sits.
 */
export function getToastHost(): HTMLDivElement {
  if (!host) {
    host = document.createElement('div');
    host.dataset.toastHost = '';
    // Out of the dialog's grid flow; the toasts inside are position: fixed,
    // and no ancestor up to a dialog or <body> transforms, so they sit at the
    // viewport's offsets wherever the host is.
    host.style.position = 'fixed';
    host.style.inset = '0 auto auto 0';
    // Above `Page`'s z-10 content layer, or its tiles and buttons cover the toast.
    host.style.zIndex = '60';
    subscribeLayers(place);
    place();
  }
  return host;
}
