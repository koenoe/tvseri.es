'use client';

import { type ReactNode, useId, useState } from 'react';
import ExpandButton from '@/components/ui/fold/ExpandButton';
import { useHiddenShows } from '@/lib/marking/hooks';

import { SHOW_ALL } from './laneCaps';

/**
 * A lane's rows, capped at `cap`; the rest open in
 * place with "Show all N" at the lane's foot, so a busy profile keeps its
 * two lanes comparable in length and nothing is a dead end. The rows are
 * rendered on the server and passed in; the hidden ones stay out of the
 * DOM until opened.
 */
export default function CappedRows({
  as: List = 'div',
  cap,
  className,
  equalRows,
  ids,
  rows: allRows,
}: Readonly<{
  as?: 'div' | 'ul';
  cap: number;
  className?: string;
  /** These rows are drawn at one height (`data-equal-rows`, checked by the overflow spec) */
  equalRows?: boolean;
  rows: ReadonlyArray<ReactNode>;
  /** Each row's show: a show hidden from in progress in this tab leaves at once */
  ids?: ReadonlyArray<number>;
}>) {
  const hidden = useHiddenShows();
  const rows = ids
    ? allRows.filter((_, index) => hidden[ids[index] ?? 0] !== true)
    : allRows;
  const [open, setOpen] = useState(false);
  const id = useId();
  const capped = rows.length > cap;
  const shown = open || !capped ? rows : rows.slice(0, cap);
  const toggle = () => setOpen((value) => !value);
  const showAll = `Show all ${rows.length}`;
  return (
    <>
      <List
        className={className}
        data-equal-rows={equalRows ? '' : undefined}
        id={id}
      >
        {shown}
      </List>
      {capped ? (
        <ExpandButton
          aria-controls={id}
          data-show-all=""
          label={showAll}
          layout={SHOW_ALL}
          onClick={toggle}
          open={open}
        />
      ) : null}
    </>
  );
}
