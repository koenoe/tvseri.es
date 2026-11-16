'use client';

import { type RefObject, useCallback, useRef } from 'react';

import useSwipeToClose, {
  type SwipeRelease,
} from '@/components/ui/gesture/useSwipeToClose';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

import { fillsScreen, untintEdges } from './EdgeTint';
import {
  closesSheet,
  dimAt,
  SHEET_SETTLE,
  sheetOffset,
  swipeMovesSheet,
} from './sheetSwipe';

const SETTLE = `${SHEET_SETTLE.duration}s cubic-bezier(${SHEET_SETTLE.ease.join(',')})`;

/**
 * Swipe down to close a phone bottom sheet, never a full-screen panel (`sheetSwipe.ts` for the rules
 * and numbers). The drag moves the panel with `translate` and fades the dim
 * with `filter: opacity()`: both compose with the `transform` and `opacity`
 * Motion animates, so Motion's entry and exit never fight the finger, and a
 * swipe that closes leaves the panel where it went: the exit then plays
 * out of sight. Settling back and leaving are CSS transitions (Vaul's 500
 * ms curve), on the compositor; nothing renders per move.
 */
export default function useSheetSwipe(
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const height = useRef(0);

  const place = useCallback(
    (offset: number, settle: boolean) => {
      const node = panel.current;
      if (!node) {
        return;
      }
      const dim = node.parentElement?.querySelector<HTMLElement>(
        ':scope > [data-dialog-backdrop]',
      );
      const transition = settle && !matchesNow(REDUCED_MOTION) ? SETTLE : '';
      node.style.transition = transition && `translate ${transition}`;
      node.style.translate = offset ? `0 ${offset}px` : '';
      if (dim) {
        const fade = dimAt(offset, height.current);
        dim.style.transition = transition && `filter ${transition}`;
        dim.style.filter = fade < 1 ? `opacity(${fade})` : '';
      }
    },
    [panel],
  );

  // Only a bottom sheet: a full-screen panel (Watch history) has no edge
  // to pull down, so a swipe there only scrolls
  const canStart = useCallback(
    (target: EventTarget | null) =>
      panel.current && !fillsScreen(panel.current)
        ? swipeMovesSheet(target, panel.current)
        : false,
    [panel],
  );

  const onMove = useCallback(
    (dy: number) => {
      const node = panel.current;
      if (node && !height.current) {
        height.current = node.offsetHeight;
        node.style.willChange = 'translate';
      }
      place(sheetOffset(dy), false);
    },
    [panel, place],
  );

  const onRelease = useCallback(
    (release: SwipeRelease | null) => {
      const node = panel.current;
      if (
        node &&
        release &&
        closesSheet({ ...release, height: height.current })
      ) {
        place(height.current, true);
        untintEdges(node);
        const settled = matchesNow(REDUCED_MOTION)
          ? 0
          : SHEET_SETTLE.duration * 1000;
        window.setTimeout(onClose, settled);
      } else {
        place(0, true);
      }
      height.current = 0;
    },
    [onClose, panel, place],
  );

  return useSwipeToClose({ canStart, onMove, onRelease });
}
