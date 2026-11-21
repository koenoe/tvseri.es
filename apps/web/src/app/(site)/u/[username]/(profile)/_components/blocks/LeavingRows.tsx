'use client';

import { AnimatePresence } from 'motion/react';
import type { ReactElement } from 'react';

import LeavingItem from '@/components/motion/LeavingItem';

import { handOverToNextRow } from './rowFocus';

/**
 * A lane's gap between rows. A row leaving shuts its gap with it: each row
 * takes the list's gap back (`pull`) and draws it itself (`push`), as
 * Connected apps' review groups do, so the gap goes as the height does.
 */
export const ROW_GAPS = {
  '2.5': { list: 'gap-2.5', pull: '-mt-2.5', push: 'pt-2.5' },
  '3.5': { list: 'gap-3.5', pull: '-mt-3.5', push: 'pt-3.5' },
  '5': { list: 'gap-5', pull: '-mt-5', push: 'pt-5' },
} as const;

export type RowGap = keyof typeof ROW_GAPS;

/** The row's key: the lanes key each row by its show */
export const rowKey = (row: ReactElement, index: number) =>
  row.key ?? String(index);

export type LeavingRowsProps = Readonly<{
  /** A row added after the first render opens as the one it replaces shuts */
  arrive: boolean;
  gap: RowGap;
  /** The rows that left from this list have all gone */
  onSettled: () => void;
  rows: ReadonlyArray<ReactElement>;
  /** The first row's place in the whole lane, so a sweep runs on across lists */
  start: number;
  sweeping: boolean;
}>;

/**
 * Rows in their list's presence: one that leaves folds out (`LeavingItem`),
 * 30ms after the one before it in a sweep (Hide all), and hands focus on
 * to the next row; one that takes its place opens as it shuts.
 */
export default function LeavingRows({
  arrive,
  as,
  gap,
  onSettled,
  rows,
  start,
  sweeping,
}: LeavingRowsProps & Readonly<{ as: 'div' | 'li' }>) {
  const { pull, push } = ROW_GAPS[gap];
  return (
    <AnimatePresence
      custom={sweeping}
      initial={false}
      onExitComplete={onSettled}
    >
      {rows.map((row, offset) => {
        const index = start + offset;
        return (
          <LeavingItem
            arrive={arrive}
            as={as}
            className={pull}
            index={index}
            key={rowKey(row, index)}
            onLeave={handOverToNextRow}
          >
            <div className={push}>{row}</div>
          </LeavingItem>
        );
      })}
    </AnimatePresence>
  );
}
