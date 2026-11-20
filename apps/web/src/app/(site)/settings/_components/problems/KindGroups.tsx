'use client';

import { plural } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';

import type { SeriesCandidate } from '@/lib/import/contract';
import AmbiguousItem from './AmbiguousItem';
import type { Fix } from './fix';
import LeavingItem from './LeavingItem';
import NotFoundItem, { type NotFoundHandlers } from './NotFoundItem';
import ProblemGroup from './ProblemGroup';
import { type ProblemItem, rowCount } from './problems';

/** What an item stands for: the import's rows, or the sync's entries */
export type ProblemUnit = 'rows' | 'entries';

const ITEM_COUNT: Readonly<Record<ProblemUnit, (count: number) => string>> = {
  entries: (count) => plural(count, 'entry', 'entries'),
  rows: rowCount,
};

const PICK_LINE: Readonly<Record<ProblemUnit, string>> = {
  entries: 'Pick the right one and its episodes come in',
  rows: 'Pick the right one and its rows come in',
};

type GroupProps = Readonly<{
  /** Beside the group's header (a sync's Skip all) */
  action?: ReactNode;
  bodyId: string;
  /** What follows the items (the import's summed-up rest) */
  children?: ReactNode;
  count: number;
  /** Fixes kept per item (the import) */
  fixes?: Readonly<Record<string, Fix>>;
  items: ReadonlyArray<ProblemItem>;
  onToggle: () => void;
  /** Its items have all just been skipped (a sync's Skip all): they leave in turn */
  sweeping?: boolean;
  /** The swept items have left */
  onSwept?: () => void;
  open: boolean;
  unit: ProblemUnit;
}>;

/** "Which series?", shared by the import and the sync's review list */
export function AmbiguousProblems({
  action,
  bodyId,
  children,
  count,
  fixes,
  items,
  onPick,
  onSkip,
  onSwept,
  onToggle,
  onUndo,
  open,
  sweeping = false,
  unit,
}: GroupProps &
  Readonly<{
    onPick: (item: ProblemItem, candidate: SeriesCandidate) => void;
    onSkip: (item: ProblemItem) => void;
    onUndo?: (key: string) => void;
  }>) {
  return (
    <ProblemGroup
      action={action}
      bodyId={bodyId}
      count={count}
      name="Which series?"
      onToggle={onToggle}
      open={open}
      what={PICK_LINE[unit]}
    >
      <AnimatePresence
        custom={sweeping}
        initial={false}
        onExitComplete={onSwept}
      >
        {items.map((item, index) => {
          const itemCount = ITEM_COUNT[unit](item.indexes.length);
          return (
            <LeavingItem index={index} key={item.key}>
              <AmbiguousItem
                count={itemCount}
                fix={fixes?.[item.key]}
                item={item}
                onPick={onPick}
                onSkip={onSkip}
                onUndo={onUndo}
              />
            </LeavingItem>
          );
        })}
      </AnimatePresence>
      {children}
    </ProblemGroup>
  );
}

/** "Not found": search for the show, or pick the episode, or skip. */
export function NotFoundProblems({
  action,
  bodyId,
  children,
  count,
  fixes,
  handlers,
  items,
  onSwept,
  onToggle,
  open,
  sweeping = false,
  unit,
}: GroupProps & Readonly<{ handlers: NotFoundHandlers }>) {
  return (
    <ProblemGroup
      action={action}
      bodyId={bodyId}
      count={count}
      name="Not found"
      onToggle={onToggle}
      open={open}
      what="No series or episode by that name on TMDB"
    >
      <AnimatePresence
        custom={sweeping}
        initial={false}
        onExitComplete={onSwept}
      >
        {items.map((item, index) => {
          const itemCount = ITEM_COUNT[unit](item.indexes.length);
          return (
            <LeavingItem index={index} key={item.key}>
              <NotFoundItem
                count={itemCount}
                fix={fixes?.[item.key]}
                handlers={handlers}
                item={item}
              />
            </LeavingItem>
          );
        })}
      </AnimatePresence>
      {children}
    </ProblemGroup>
  );
}
