'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { type ReactNode, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SHEET_EASE } from '@/components/motion/ease';
import ExpandButton from '@/components/ui/fold/ExpandButton';
import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { SHOW_ALL } from '../../_components/blocks/laneCaps';
import { NO_DATE_TILES } from './calendarStyles';

/** A fold's tiles, the grid's gap above them */
const FOLD_TILES = `${NO_DATE_TILES} pt-2.5`;

/** Each press of the foot opens ten more */
const STEP = 10;

/** A fold opens to its height in 320ms with a 200ms fade; closes in 240ms */
const FOLD_IN = { height: 'auto', opacity: 1 } as const;
const FOLD_OUT = { height: 0, opacity: 0 } as const;
const FOLD_TIMING = {
  height: { duration: 0.32, ease: SHEET_EASE },
  opacity: { duration: 0.2, ease: 'easeOut' },
} as const;
const FOLD_EXIT = {
  ...FOLD_OUT,
  transition: {
    height: { duration: 0.24, ease: SHEET_EASE },
    opacity: { duration: 0.12 },
  },
} as const;

/**
 * Renewed, nothing listed yet: the first five tiles (two on a phone), then
 * ten more per press of "Show 10 more", each ten opening as one fold; once
 * all show, "Show fewer" folds them away. The press moves focus to the
 * first tile it opened. The tiles are rendered on the server.
 */
export default function NoDateFold({
  tiles,
}: Readonly<{ tiles: ReadonlyArray<ReactNode> }>) {
  const phone = useMediaQuery(PHONE);
  const first = phone ? 2 : 5;
  const [folds, setFolds] = useState(0);
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const shown = Math.min(tiles.length, first + folds * STEP);
  const more = Math.min(STEP, tiles.length - shown);
  if (tiles.length <= first) {
    return <div className={NO_DATE_TILES}>{tiles}</div>;
  }
  const chunks = Array.from({ length: folds }, (_, index) =>
    tiles.slice(first + index * STEP, first + (index + 1) * STEP),
  );
  const press = () => {
    if (!more) {
      setFolds(0);
      return;
    }
    flushSync(() => setFolds((value) => value + 1));
    listRef.current
      ?.querySelector<HTMLElement>(`[data-fold="${folds + 1}"] a[href]`)
      ?.focus();
  };
  const label = `Show ${more || STEP} more`;
  return (
    <div className="flex flex-col gap-2.5">
      <div id={id} ref={listRef}>
        <div className={NO_DATE_TILES}>{tiles.slice(0, first)}</div>
        <AnimatePresence initial={false}>
          {chunks.map((chunk, index) => (
            <m.div
              animate={FOLD_IN}
              className="overflow-hidden"
              data-fold={index + 1}
              exit={FOLD_EXIT}
              initial={FOLD_OUT}
              key={index}
              transition={FOLD_TIMING}
            >
              <div className={FOLD_TILES}>{chunk}</div>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
      <ExpandButton
        aria-controls={id}
        label={label}
        layout={SHOW_ALL}
        onClick={press}
        open={!more}
      />
    </div>
  );
}
