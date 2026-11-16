'use client';

import { useCallback, useState } from 'react';

/**
 * An element's content width, from a ResizeObserver set up in a ref callback.
 * It is measured once as the element mounts (before paint), so a phone
 * never shows the strip planned for `initial` first.
 */
export function useElementWidth(initial: number) {
  const [width, setWidth] = useState(initial);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) {
      return;
    }
    setWidth(Math.round(node.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [width, ref] as const;
}
