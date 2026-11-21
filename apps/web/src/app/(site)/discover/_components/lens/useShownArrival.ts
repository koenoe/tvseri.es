import { useState } from 'react';

import useTabArrival from '@/components/motion/useTabArrival';

/**
 * How many times the viewer has shown this part. A lens's grid stays
 * mounted and its row's slot too, so each showing needs its own arrival: a
 * part only settles its own rise, never while hidden. Adjusted while
 * rendering (React's pattern for it), so no effect.
 */
function useShowings(shown: boolean): number {
  const [seen, setSeen] = useState({ showings: 0, shown });
  if (seen.shown !== shown) {
    setSeen({ showings: seen.showings + (shown ? 1 : 0), shown });
  }
  return seen.showings + (shown && !seen.shown ? 1 : 0);
}

/**
 * A lens part's rise (`TAB_ARRIVE`) each time the viewer shows it (a lens's
 * grid, an opened row), as a landing row's tab does (`useTabArrival`): not on
 * the first paint, and not again when Back shows the page.
 */
export default function useShownArrival(shown: boolean) {
  return useTabArrival(String(useShowings(shown)));
}
