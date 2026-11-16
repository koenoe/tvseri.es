'use client';

import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react';

type Anchor = Readonly<{ element: Element; top: number }>;

/** Frames after a prepend in which late layout (skipped cells) is corrected */
const SETTLE_FRAMES = 3;

/** The first item whose bottom is below the top of the screen */
function firstVisible(list: HTMLElement, selector?: string): Element | null {
  const items = selector ? list.querySelectorAll(selector) : list.children;
  for (const item of items) {
    if (item.getBoundingClientRect().bottom > 0) {
      return item;
    }
  }
  return null;
}

/**
 * Holds the reader's place while items are added above (the Library's
 * "A–O · 131 shows · load", History's "Newer: April 2024"): call `capture`
 * just before the prepend lands (`usePaginated`'s `onPrepend`); when the
 * new `items` commit, a layout effect scrolls by however far the first
 * visible item moved, before paint. Instant, never smooth ("scroll jumps, never
 * smooth-scrolls"), and not CSS `overflow-anchor`,
 * which WebKit doesn't do.
 *
 * `items` is the list's array (the commit to correct is the one that
 * changes it); `selector` picks the items inside `listRef` when they aren't
 * its children (History's day rows inside month sections).
 */
export default function useScrollAnchor(
  listRef: RefObject<HTMLElement | null>,
  items: unknown,
  selector?: string,
): () => void {
  const anchor = useRef<Anchor | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on each new `items`, the commit of the prepend
  useLayoutEffect(() => {
    const held = anchor.current;
    anchor.current = null;
    if (!held?.element.isConnected) {
      return;
    }
    const { element, top } = held;
    const correct = () => {
      const moved = element.getBoundingClientRect().top - top;
      if (Math.abs(moved) >= 0.5) {
        window.scrollBy({ behavior: 'instant', top: moved });
      }
    };
    correct();
    // Cells above that `content-visibility` skipped settle at their real
    // height once the scroll brings them near: hold the place again then
    let frames = 0;
    const again = () => {
      if (!element.isConnected) {
        return;
      }
      correct();
      frames += 1;
      if (frames < SETTLE_FRAMES) {
        requestAnimationFrame(again);
      }
    };
    requestAnimationFrame(again);
  }, [items]);

  return useCallback(() => {
    const list = listRef.current;
    const element = list ? firstVisible(list, selector) : null;
    anchor.current = element
      ? { element, top: element.getBoundingClientRect().top }
      : null;
  }, [listRef, selector]);
}
