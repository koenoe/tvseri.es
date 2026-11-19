'use client';

import { useCallback, useState } from 'react';

/**
 * The bar's width in whole px, from a ResizeObserver set up by the ref
 * itself (React 19 ref cleanup), so no effect and no layout read in
 * render: `null` until the first observation (the server's paint draws
 * every run). Only the map measures; the plain fill doesn't need it.
 */
export default function useTrackWidth() {
  const [width, setWidth] = useState<number | null>(null);
  const ref = useCallback((node: HTMLSpanElement | null) => {
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
