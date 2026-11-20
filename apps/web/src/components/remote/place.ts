import {
  clamp,
  clampLeft,
  MARGIN,
  type Rect,
  type Size,
} from '@/components/ui/popover/place';

/**
 * - `side`: the show page. The remote grows sideways from the ⋯, 12px to its
 *   right, the first key level with it.
 * - `below`: the In progress tile. Under the ⋯ with the right edges aligned,
 *   8px gap.
 * - `below-start`: a Library tile. Under the ⋯, 8px gap,
 *   growing to the right from the ⋯'s left edge; right-aligned instead when
 *   that would leave the viewport.
 */
export type RemotePlacement = 'below' | 'below-start' | 'side';

export type RemotePosition = Readonly<{
  left: number;
  /** The ⋯'s centre relative to the panel: the grow's transform-origin. */
  originX: number;
  originY: number;
  top: number;
}>;

const SIDE_GAP = 12;
const BELOW_GAP = 8;
/** The panel's padding: the first key sits level with the ⋯. */
const PANEL_PADDING = 8;

/** Where the desktop remote goes (viewport px), kept 16px inside the viewport. */
export function placeRemote({
  panel,
  placement,
  trigger,
  viewport,
}: Readonly<{
  panel: Size;
  placement: RemotePlacement;
  trigger: Rect;
  viewport: Size;
}>): RemotePosition {
  const maxLeft = viewport.width - panel.width - MARGIN;
  const maxTop = viewport.height - panel.height - MARGIN;
  let left: number;
  let top: number;
  if (placement === 'side') {
    left = trigger.right + SIDE_GAP;
    if (left > maxLeft) {
      left = trigger.left - SIDE_GAP - panel.width;
    }
    top = clamp(trigger.top - PANEL_PADDING, MARGIN, Math.max(MARGIN, maxTop));
  } else {
    left =
      placement === 'below-start' && trigger.left <= maxLeft
        ? trigger.left
        : trigger.right - panel.width;
    top = trigger.bottom + BELOW_GAP;
    const above = trigger.top - BELOW_GAP - panel.height;
    if (top > maxTop && above >= MARGIN) {
      top = above;
    }
  }
  left = clampLeft(left, panel.width, viewport.width);
  return {
    left,
    originX: (trigger.left + trigger.right) / 2 - left,
    originY: (trigger.top + trigger.bottom) / 2 - top,
    top,
  };
}
