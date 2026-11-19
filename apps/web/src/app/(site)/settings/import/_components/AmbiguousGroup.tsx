'use client';

import { formatGrouped, plural } from '@tvseri.es/utils';
import type { SeriesCandidate } from '@/lib/import/contract';
import type { Fix } from '../../_components/problems/fix';
import { AmbiguousProblems } from '../../_components/problems/KindGroups';
import { rowsIn, splitItems } from '../../_components/problems/problemRows';
import type { ProblemItem } from '../../_components/problems/problems';
import type { Importer } from '../_lib/useImporter';
import ProblemRest from './ProblemRest';

/** The import's "Which series?": two items, then the rest summed up. */
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
    <AmbiguousProblems
      bodyId="import-group-ambiguous"
      count={count}
      fixes={fixes}
      items={shown}
      onPick={onPick}
      onSkip={onSkip}
      onToggle={toggle}
      onUndo={importer.clearFix}
      open={open}
      unit="rows"
    >
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
    </AmbiguousProblems>
  );
}
