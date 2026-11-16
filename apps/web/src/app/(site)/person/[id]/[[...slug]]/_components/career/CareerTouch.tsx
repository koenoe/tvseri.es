'use client';

import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
} from 'react';

import cn from '@/lib/cn';

import styles from './career.module.css';

const ROW = '[data-career-row]';

const clear = (grid: HTMLElement, keep?: Element) => {
  for (const row of grid.querySelectorAll(`${ROW}[data-hot]`)) {
    if (row !== keep) {
      row.removeAttribute('data-hot');
    }
  }
};

/**
 * The chart's touch rule ("Click, keys"): the first tap
 * on a row lights it (caption, others dim) and the second opens the show.
 * Hover and keyboard focus are CSS (`career.module.css`); this only marks
 * the tapped row with `data-hot`, without a re-render. While a row is lit
 * one listener on the document lets it go on a tap outside; it is removed
 * then, or when the chart unmounts.
 */
export default function CareerTouch({
  children,
}: Readonly<{ children: ReactNode }>) {
  const touch = useRef(false);
  const grid = useRef<HTMLDivElement | null>(null);
  const outside = useRef<((event: globalThis.PointerEvent) => void) | null>(
    null,
  );
  const stopListening = useCallback(() => {
    if (outside.current) {
      document.removeEventListener('pointerdown', outside.current, true);
      outside.current = null;
    }
  }, []);
  // React 19: the returned function is the ref's cleanup (unmount)
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      grid.current = node;
      return () => {
        stopListening();
        grid.current = null;
      };
    },
    [stopListening],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    touch.current = event.pointerType === 'touch';
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const root = grid.current;
    const row =
      event.target instanceof Element ? event.target.closest(ROW) : null;
    if (!root || !row) {
      return;
    }
    clear(root, row);
    if (touch.current && !row.hasAttribute('data-hot')) {
      event.preventDefault();
      event.stopPropagation();
      row.setAttribute('data-hot', '');
      // A tap anywhere outside the chart lets the row go (no focusout on a
      // tap that lands on nothing focusable): one listener, however many
      // rows get lit before it
      if (!outside.current) {
        const release = (event: globalThis.PointerEvent) => {
          if (!(event.target instanceof Node && root.contains(event.target))) {
            clear(root);
            stopListening();
          }
        };
        outside.current = release;
        document.addEventListener('pointerdown', release, true);
      }
    }
  };

  const onBlur = () => {
    if (grid.current) {
      clear(grid.current);
    }
  };

  const classes = cn(styles.grid, 'relative flex flex-col');
  return (
    <div
      className={classes}
      onBlur={onBlur}
      onClickCapture={onClickCapture}
      onPointerDown={onPointerDown}
      ref={attach}
    >
      {children}
    </div>
  );
}
