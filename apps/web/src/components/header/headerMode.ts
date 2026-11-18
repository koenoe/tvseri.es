/** Under this many pixels the header is always the static bar. */
const SCROLL_THRESHOLD = 60;

/** Scrolling up this far since the last turn brings the pill back. */
const SCROLL_TOLERANCE = 8;

/**
 * `static`: the bar at the top of the page. `floating`: the frosted pill,
 * fixed at the top, shown when scrolling up past the threshold. `hidden`:
 * scrolled away while scrolling down.
 */
export type HeaderMode = 'static' | 'floating' | 'hidden';

export type ScrollTracker = Readonly<{
  lastY: number;
  mode: HeaderMode;
  /** pathname + search of the last scroll event; `null` before the first */
  path: string | null;
  /** Where the page last turned from scrolling down to up */
  peakY: number;
}>;

/**
 * One scroll event. Past 60px the header hides on the first pixel down and
 * returns as the pill once the way up since the last turn reaches 8px
 * (Headroom's tolerance), so a wobble doesn't flicker it. A
 * different path means a navigation happened since the last event (Next
 * scrolls on navigation): the header resets to the static bar and the
 * position becomes the new baseline.
 */
export function trackScroll(
  tracker: ScrollTracker,
  { path, y }: Readonly<{ path: string; y: number }>,
): ScrollTracker {
  if (tracker.path !== path || y <= SCROLL_THRESHOLD) {
    return { lastY: y, mode: 'static', path, peakY: y };
  }
  if (y > tracker.lastY) {
    return { lastY: y, mode: 'hidden', path, peakY: y };
  }
  const mode =
    tracker.peakY - y >= SCROLL_TOLERANCE ? 'floating' : tracker.mode;
  return { lastY: y, mode, path, peakY: tracker.peakY };
}

/**
 * Keyboard focus moving into the header (Tab, Shift+Tab, a skip link) while
 * it is scrolled away shows the pill, so focus never lands on something the
 * user can't see. The static bar and the pill stay as they are.
 */
export function modeOnFocus(mode: HeaderMode): HeaderMode {
  return mode === 'hidden' ? 'floating' : mode;
}
