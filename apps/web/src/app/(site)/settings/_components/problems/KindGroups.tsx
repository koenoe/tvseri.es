'use client';

import { plural } from '@tvseri.es/utils';
import type { ReactNode } from 'react';

import type { SeriesCandidate } from '@/lib/import/contract';
import AmbiguousItem from './AmbiguousItem';
import type { Fix } from './fix';
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
  onToggle,
  onUndo,
  open,
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
      {items.map((item) => {
        const itemCount = ITEM_COUNT[unit](item.indexes.length);
        return (
          <AmbiguousItem
            count={itemCount}
            fix={fixes?.[item.key]}
            item={item}
            key={item.key}
            onPick={onPick}
            onSkip={onSkip}
            onUndo={onUndo}
          />
        );
      })}
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
  onToggle,
  open,
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
      {items.map((item) => {
        const itemCount = ITEM_COUNT[unit](item.indexes.length);
        return (
          <NotFoundItem
            count={itemCount}
            fix={fixes?.[item.key]}
            handlers={handlers}
            item={item}
            key={item.key}
          />
        );
      })}
      {children}
    </ProblemGroup>
  );
}
