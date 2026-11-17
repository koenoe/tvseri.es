'use client';

import { formatGrouped } from '@/lib/formatCount';
import type { Fix } from '../_lib/importState';
import { rowsIn, splitItems } from '../_lib/problemRows';
import type { ProblemItem } from '../_lib/problems';
import type { Importer } from '../_lib/useImporter';
import NotFoundItem, { type NotFoundHandlers } from './NotFoundItem';
import ProblemGroup from './ProblemGroup';
import ProblemRest from './ProblemRest';

/** "Not found": search manually or skip; recaps and extras are summed up. */
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
    <ProblemGroup
      count={count}
      id="not-found"
      name="Not found"
      onToggle={toggle}
      open={open}
      what="No series or episode by that name on TMDB"
    >
      {shown.map((item) => (
        <NotFoundItem
          fix={fixes[item.key]}
          handlers={handlers}
          item={item}
          key={item.key}
        />
      ))}
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
    </ProblemGroup>
  );
}
