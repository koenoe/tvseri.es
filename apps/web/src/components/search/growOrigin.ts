/** The header's search icon (the bar and the floating pill share it). */
const HEADER_ICON = 'header [data-search-trigger]';

/**
 * The panel grows out of the search icon and shrinks back into it: its
 * `transform-origin` is the trigger's centre, in
 * the panel's own coordinates. Opened with the shortcut, the header's icon
 * is the trigger. Offsets, not the panel's
 * `getBoundingClientRect`, because the panel is already scaled by its
 * starting style. With no icon on screen it grows from its top centre.
 */
export default function growOrigin(
  trigger: HTMLElement | null,
  panel: HTMLElement,
): string {
  const from = trigger?.isConnected
    ? trigger
    : document.querySelector<HTMLElement>(HEADER_ICON);
  const rect = from?.getBoundingClientRect();
  if (!rect?.width) {
    return '50% 0';
  }
  const x = rect.left + rect.width / 2 - panel.offsetLeft;
  const y = rect.top + rect.height / 2 - panel.offsetTop;
  return `${Math.round(x)}px ${Math.round(y)}px`;
}
