import cn from '@/lib/cn';

/**
 * Safari 26 on iOS has no `theme-color`: it colours its status bar and the
 * band under its floating toolbar from the `fixed` element at each edge of
 * the viewport, reading that element's declared `background-color`. A modal
 * `<dialog>` is a transparent, viewport-sized fixed box, so Safari keeps the
 * page's colour at the top over a full-screen panel, and at the bottom it
 * switches to the panel's colour only once the entry has settled (measured
 * in the iOS 26.2 simulator: about 250 ms after the sheet started to slide
 * in, a hard switch from the page colour to white under the ⋯ sheet).
 *
 * These strips give Safari the panel's colour from the first frame: fixed,
 * full width, 12px tall (WebKit reads the declared colour of a box over
 * 10px and at least 80% of the width), unpainted (an empty mask, which the
 * sampler doesn't consult) and inert. A strip with no colour (transparent)
 * is skipped, which leaves Safari's own choice: the top for a bottom sheet.
 * Direct children of the dialog, so a transformed panel never becomes their
 * containing block. `className` hides them where the panel is no sheet
 * (desktop Safari tints its toolbar the same way).
 */
const STRIP =
  'pointer-events-none fixed inset-x-0 h-3 [mask-image:linear-gradient(transparent,transparent)]';

export default function EdgeTint({
  className,
}: Readonly<{ className: string }>) {
  const top = cn(STRIP, 'top-0 bg-(--edge-tint-top,transparent)', className);
  const bottom = cn(
    STRIP,
    'bottom-0 bg-(--edge-tint-bottom,transparent)',
    className,
  );
  return (
    <>
      <div aria-hidden className={top} data-edge-tint="" />
      <div aria-hidden className={bottom} data-edge-tint="" />
    </>
  );
}

/**
 * Gives the strips of the panel's dialog its ground, read once as it
 * opens: the bottom edge always, the top only when the panel reaches it
 * (full screen; `offsetTop` ignores the entry's transform).
 */
export function tintEdges(panel: HTMLElement) {
  const dialog = panel.parentElement;
  if (!dialog) {
    return;
  }
  const ground = getComputedStyle(panel).backgroundColor;
  dialog.style.setProperty('--edge-tint-bottom', ground);
  if (panel.offsetTop <= 0) {
    dialog.style.setProperty('--edge-tint-top', ground);
  }
}

/**
 * As the panel leaves (its exit, a swipe that closes it): the strips it
 * coloured take the page's colour, so Safari's bars go back with the panel
 * (measured: a strip that went transparent left the band white until the
 * dialog was gone, Safari keeps its last colour).
 */
export function untintEdges(panel: HTMLElement) {
  const dialog = panel.parentElement;
  if (!dialog) {
    return;
  }
  const page = getComputedStyle(document.body).backgroundColor;
  for (const edge of ['--edge-tint-top', '--edge-tint-bottom']) {
    if (dialog.style.getPropertyValue(edge)) {
      dialog.style.setProperty(edge, page);
    }
  }
}
