'use client';

import { type MouseEvent, useCallback, useMemo } from 'react';

import { type PointerLike, usePointerRun } from '../../_lib/pointerRun';
import type { SheetChip } from './chips';
import {
  type ChipBox,
  hitChip,
  type RunCommit,
  runCommit,
  runDirection,
} from './paint';
import type { SheetUiStore } from './sheetUi';

const indexOf = (target: EventTarget | null): number | null => {
  const chip =
    target instanceof Element
      ? target.closest<HTMLElement>('[data-chip]')
      : null;
  return chip ? Number(chip.dataset.chip) : null;
};

/** Each chip's box relative to the grid, read once when a run starts. */
function measure(grid: HTMLElement, rect: DOMRect): ChipBox[] {
  return Array.from(grid.children, (child) => {
    const box = child.getBoundingClientRect();
    return {
      height: box.height,
      width: box.width,
      x: box.left - rect.left,
      y: box.top - rect.top,
    };
  });
}

/**
 * The chips' paint gesture on the page's shared
 * pointer run (`_lib/pointerRun.ts`): a press on a chip, a 6px move (touch:
 * a 350ms press, or a sideways move; vertical moves scroll) starts a run,
 * the chip under the pointer extends it, the release commits it per mode.
 * A tap is the chip's click; the click after a run is swallowed. Boxes are
 * measured once per run, so a move is a lookup (no layout reads).
 */
export default function usePaintGesture(
  input: Readonly<{
    store: SheetUiStore;
    seasonNumber: number;
    chips: ReadonlyArray<SheetChip>;
    onTap: (chip: SheetChip) => void;
    onCommit: (commit: RunCommit) => void;
  }>,
) {
  const { chips, onCommit, onTap, seasonNumber, store } = input;
  const open = (index: number | null) =>
    index !== null && chips[index] !== undefined && chips[index].state !== 'na';

  const gesture = usePointerRun<ChipBox[]>({
    axis: 'xy',
    indexAt: (boxes, x, y) => {
      const index = hitChip(boxes, x, y);
      return open(index) ? index : null;
    },
    longPress: true,
    measure,
    onEnd: (_, commit) => {
      if (!commit) {
        store.setState({ run: null });
        return;
      }
      const { mode, run } = store.getState();
      store.setState({ ask: null, last: null, run: null });
      if (run) {
        onCommit(runCommit(chips, mode, run));
      }
    },
    onMove: ({ to }) => {
      const live = store.getState().run;
      if (live) {
        store.setState({ run: { ...live, to } });
      }
    },
    onStart: (from) => {
      const start = chips[from];
      if (!start) {
        return;
      }
      store.setState({
        ask: null,
        run: {
          direction: runDirection(store.getState().mode, start),
          from,
          seasonNumber,
          to: from,
        },
      });
    },
    pressIndex: (event: PointerLike) => {
      const index = indexOf(event.target);
      return open(index) ? index : null;
    },
  });

  const { consumeClick, handlers } = gesture;
  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (consumeClick(event)) {
        return;
      }
      const index = indexOf(event.target);
      const chip = index === null ? undefined : chips[index];
      if (chip && chip.state !== 'na') {
        onTap(chip);
      }
    },
    [chips, consumeClick, onTap],
  );

  return useMemo(() => ({ ...handlers, onClick }), [handlers, onClick]);
}
