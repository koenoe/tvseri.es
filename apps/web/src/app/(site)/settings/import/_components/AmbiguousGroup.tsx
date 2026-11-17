'use client';

import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';
import type { SeriesCandidate } from '@/lib/import/contract';
import type { Fix } from '../_lib/importState';
import { rowsIn, splitItems } from '../_lib/problemRows';
import type { ProblemItem } from '../_lib/problems';
import type { Importer } from '../_lib/useImporter';
import AmbiguousItem from './AmbiguousItem';
import ProblemGroup from './ProblemGroup';
import ProblemRest from './ProblemRest';

/** "Two series with this name": pick the right one and its rows come in. */
export default function AmbiguousGroup({
  count,
  expanded,
  fixes,
  importer,
  items,
  onPick,
  onShowAll,
  onSkip,
  open,
}: Readonly<{
  /** Rows still open in the group */
  count: number;
  /** Every item shown, none summed up */
  expanded: boolean;
  fixes: Readonly<Record<string, Fix>>;
  importer: Importer;
  items: ReadonlyArray<ProblemItem>;
  onPick: (item: ProblemItem, candidate: SeriesCandidate) => void;
  onShowAll: () => void;
  onSkip: (item: ProblemItem) => void;
  open: boolean;
}>) {
  const { rest, shown } = splitItems(items, expanded);
  const restRows = rowsIn(rest);
  const toggle = () => importer.toggleGroup('ambiguous');
  const restTitle = `${formatGrouped(restRows)} more rows across ${plural(rest.length, 'series', 'series')}`;
  const restToast = `Skipped ${plural(restRows, 'row')}`;
  return (
    <ProblemGroup
      count={count}
      id="ambiguous"
      name="Two series with this name"
      onToggle={toggle}
      open={open}
      what="Pick the right one and its rows come in"
    >
      {shown.map((item) => (
        <AmbiguousItem
          fix={fixes[item.key]}
          item={item}
          key={item.key}
          onPick={onPick}
          onSkip={onSkip}
          onUndo={importer.clearFix}
        />
      ))}
      {rest.length > 0 ? (
        <ProblemRest
          fixes={fixes}
          importer={importer}
          items={rest}
          onShow={onShowAll}
          skipLabel="Skip them"
          title={restTitle}
          toast={restToast}
          why="More series that share a name"
        />
      ) : null}
    </ProblemGroup>
  );
}
