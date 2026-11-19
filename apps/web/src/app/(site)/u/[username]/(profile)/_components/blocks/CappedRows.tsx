'use client';

import { type ReactNode, useId, useState } from 'react';
import ExpandButton from '@/components/ui/fold/ExpandButton';
import { useHiddenShows } from '@/lib/marking/hooks';

import { SHOW_ALL } from './laneCaps';

/**
 * A list of `total` rows capped at `cap`: how many show (`limit`), the
 * list's id for the foot's `aria-controls`, and the foot's toggle
 */
function useCap(total: number, cap: number) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const capped = total > cap;
  const limit = open || !capped ? total : cap;
  const toggle = () => setOpen((value) => !value);
  return { capped, id, limit, open, toggle } as const;
}

/** A capped lane's foot: "Show all 22" / "Show fewer" */
function ShowAll({
  controls,
  open,
  toggle,
  total,
}: Readonly<{
  /** the list's id */
  controls: string;
  open: boolean;
  toggle: () => void;
  total: number;
}>) {
  const label = `Show all ${total}`;
  return (
    <ExpandButton
      aria-controls={controls}
      data-show-all=""
      label={label}
      layout={SHOW_ALL}
      onClick={toggle}
      open={open}
    />
  );
}

/**
 * A lane's rows, capped at `cap`; the rest open in place with "Show all N"
 * at the lane's foot, so a busy profile keeps its two lanes comparable in
 * length and nothing is a dead end. The rows are rendered on the server and
 * passed in; the hidden ones stay out of the DOM until opened.
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
  const { capped, id, limit, open, toggle } = useCap(rows.length, cap);
  const shown = rows.slice(0, limit);
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
        <ShowAll
          controls={id}
          open={open}
          toggle={toggle}
          total={rows.length}
        />
      ) : null}
    </>
  );
}
