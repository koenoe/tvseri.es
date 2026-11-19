'use client';

import { formatGrouped } from '@tvseri.es/utils';
import type { Fix } from '../../_components/problems/fix';
import { NotFoundProblems } from '../../_components/problems/KindGroups';
import type { NotFoundHandlers } from '../../_components/problems/NotFoundItem';
import { rowsIn, splitItems } from '../../_components/problems/problemRows';
import type { ProblemItem } from '../../_components/problems/problems';
import type { Importer } from '../_lib/useImporter';
import ProblemRest from './ProblemRest';

/** The import's "Not found": two items, then recaps and extras summed up. */
export default function NotFoundGroup({
  count,
  expanded,
  fixes,
  handlers,
  importer,
  items,
  onShowAll,
  open,
}: Readonly<{
  /** Rows still open in the group */
  count: number;
  /** Every item shown, none summed up */
  expanded: boolean;
  fixes: Readonly<Record<string, Fix>>;
  handlers: NotFoundHandlers;
  importer: Importer;
  items: ReadonlyArray<ProblemItem>;
  onShowAll: () => void;
  open: boolean;
}>) {
  const { rest, shown } = splitItems(items, expanded);
  const restRows = formatGrouped(rowsIn(rest));
  const toggle = () => importer.toggleGroup('notFound');
  const like = rest
    .slice(0, 2)
    .map((item) => item.query)
    .join(' and ');
  const skipLabel = `Skip all ${restRows}`;
  const restTitle = `${restRows} more like these`;
  const restToast = `Skipped ${restRows} recaps and extras`;
  const restWhy = `Recaps, extras and titles TMDB doesn’t know, like ${like}`;
  return (
    <NotFoundProblems
      bodyId="import-group-not-found"
      count={count}
      fixes={fixes}
      handlers={handlers}
      items={shown}
      onToggle={toggle}
      open={open}
      unit="rows"
    >
      {rest.length > 0 ? (
        <ProblemRest
          fixes={fixes}
          importer={importer}
          items={rest}
          onShow={onShowAll}
          skipLabel={skipLabel}
          title={restTitle}
          toast={restToast}
          why={restWhy}
        />
      ) : null}
    </NotFoundProblems>
  );
}
