import type { MouseEvent } from 'react';

/**
 * A link's `onClick` for a page switch that opens at the top of the page
 * (with `scroll={false}` on the `Link`: Next's own scroll brings the first
 * changed segment into view instead, which is the wrong place when the
 * changed part starts below a header or ends in a tail slot). Only a plain
 * press: one that opens the link elsewhere (a modifier key) leaves the page
 * where it is.
 */
export default function toTopOnPress(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button === 0 &&
    !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
  ) {
    window.scrollTo({ behavior: 'instant', top: 0 });
  }
}
