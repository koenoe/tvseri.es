'use client';

import { inView } from 'motion/react';
import { type ReactNode, useCallback, useTransition } from 'react';

/** A list reads 2,000px ahead; the Library two rows (600px) */
const DEFAULT_MARGIN = '0px 0px 2000px 0px';

/**
 * Loads the next page when a sentinel `margin` below the content comes into
 * view. The observer is set up by the sentinel's ref, and again for each
 * new page (`loadMore` changes with it), so a sentinel still in view after a
 * short page loads the next one too.
 */
export default function InfiniteScroll({
  children,
  hasMore,
  loadMore,
  margin = DEFAULT_MARGIN,
}: Readonly<{
  children: ReactNode;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
  /** How far below the screen the next read starts, as a root margin */
  margin?: `${number}px ${number}px ${number}px ${number}px`;
}>) {
  const [, startTransition] = useTransition();
  const sentinel = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return;
      }
      return inView(
        element,
        () => {
          startTransition(async () => {
            await loadMore();
          });
        },
        { margin },
      );
    },
    [loadMore, margin],
  );

  return (
    <div className="relative">
      {children}
      {hasMore ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-px w-full"
          ref={sentinel}
        />
      ) : null}
    </div>
  );
}
