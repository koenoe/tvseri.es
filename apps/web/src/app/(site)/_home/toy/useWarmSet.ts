'use client';

import { useCallback, useState } from 'react';

/**
 * Which of a toy's stacked images are mounted: the one on screen and any
 * the viewer is about to pick (hovered, focused, or next to it), so a pick
 * shows an image that is already loading instead of loading six up front.
 */
export default function useWarmSet(initial: ReadonlyArray<number>) {
  const [warm, setWarm] = useState<ReadonlySet<number>>(() => new Set(initial));
  const add = useCallback((...indices: ReadonlyArray<number>) => {
    setWarm((current) =>
      indices.every((index) => current.has(index))
        ? current
        : new Set([...current, ...indices]),
    );
  }, []);
  return [warm, add] as const;
}
