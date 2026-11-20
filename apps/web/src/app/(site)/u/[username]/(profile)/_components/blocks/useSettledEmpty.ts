'use client';

import { useState } from 'react';

/**
 * Whether a lane whose rows leave (`CappedRows`) is empty yet: at once when
 * it loads with none, otherwise only once the last row has folded out
 * (`onSettled`, `CappedRows`'), so its empty state never swaps in over rows
 * still leaving. Rows coming back (an Undo, a refused write) make it wait
 * again. State adjusted while rendering, React's pattern for it, so no
 * effect.
 */
export default function useSettledEmpty(count: number) {
  const [settled, setSettled] = useState(count === 0);
  if (count > 0 && settled) {
    setSettled(false);
  }
  const onSettled = () => setSettled(true);
  return { empty: count === 0 && settled, onSettled } as const;
}
