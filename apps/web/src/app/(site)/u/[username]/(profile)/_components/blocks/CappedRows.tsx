'use client';

import { AnimatePresence } from 'motion/react';
import { type ReactElement, useId, useRef, useState } from 'react';
import FoldPresence from '@/components/motion/FoldPresence';
import ExpandButton from '@/components/ui/fold/ExpandButton';
import cn from '@/lib/cn';
import { useHiddenShows } from '@/lib/marking/hooks';
import LeavingRows, {
  type LeavingRowsProps,
  ROW_GAPS,
  type RowGap,
  rowKey,
} from './LeavingRows';
import { SHOW_ALL } from './laneCaps';
import { LANE_ROWS } from './rowFocus';

/** The first row link in the tab order (a poster link sits out of it) */
const FIRST_LINK = 'a[href]:not([tabindex="-1"])';

/** A capped lane's foot: "Show all 22" / "Show fewer" */
function ShowAll({
  controls,
  open,
  toggle,
  total,
}: Readonly<{
  /** the rows' id */
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
 * The rows past the cap, folding open and shut as the calendar's No date
 * yet does. A second list in the same layout; its first child is an empty
 * spacer, so the list's own gap draws the gap above the first row inside
 * the fold, and nothing jumps. The spacer has no height, so the overflow
 * spec's equal-rows check skips it.
 */
function RestFold({
  className,
  equalRows,
  ...rows
}: LeavingRowsProps & Readonly<{ className: string; equalRows?: string }>) {
  return (
    // its rows leave out of reach (inert) while they fold away
    <FoldPresence>
      <div
        className={className}
        data-equal-rows={equalRows}
        data-rest=""
        ref={focusFirstRow}
      >
        <span aria-hidden="true" />
        <LeavingRows as="div" {...rows} />
      </div>
    </FoldPresence>
  );
}

/**
 * The rest mounts only for a press on "Show all": focus moves to the first
 * row it opened as it mounts, in the commit itself (no synchronous render
 * forced inside the click)
 */
const focusFirstRow = (node: HTMLDivElement | null) => {
  node?.querySelector<HTMLElement>(FIRST_LINK)?.focus();
};

/** A row of `list` still leaving (inert while it folds out) */
const stillLeaving = (list: Element | null | undefined) =>
  Boolean(list?.querySelector(':scope > [inert]'));

/**
 * A lane's rows, capped at `cap`; the rest open in place with "Show all N"
 * at the lane's foot, so a busy profile keeps its two lanes comparable in
 * length and nothing is a dead end. The rows are rendered on the server and
 * passed in, keyed by show; the hidden ones stay out of the DOM until
 * opened.
 *
 * A row that goes (answered, caught up, hidden from in progress anywhere in
 * the tab) folds out and the rows under it close up; with the lane shut,
 * the next one past the cap opens into the last place as it does, so the
 * lane keeps its height. `onSettled` says when the last of them has gone,
 * so a lane swaps in its empty state only then.
 *
 * A `div` lane folds the rest open (focus moves to the first row opened);
 * a `ul` lane opens in one frame, since its rows are `li`s that can't sit
 * in a fold's `div` and splitting them into two lists would read as two
 * lists.
 */
export default function CappedRows({
  as: List = 'div',
  cap,
  className,
  equalRows,
  gap,
  ids,
  onSettled,
  rows: allRows,
  sweeping = false,
}: Readonly<{
  as?: 'div' | 'ul';
  cap: number;
  /** The list's own layout past its column and gap (a padding) */
  className?: string;
  /** These rows are drawn at one height (`data-equal-rows`, checked by the overflow spec) */
  equalRows?: boolean;
  gap: RowGap;
  /** Each row's show: a show hidden from in progress in this tab leaves */
  ids?: ReadonlyArray<number>;
  /** The rows that left have all gone */
  onSettled?: () => void;
  rows: ReadonlyArray<ReactElement>;
  /** The rows leaving now go together (Hide all): one after another */
  sweeping?: boolean;
}>) {
  const hidden = useHiddenShows();
  const rows = ids
    ? allRows.filter((_, index) => hidden[ids[index] ?? 0] !== true)
    : allRows;
  const [open, setOpen] = useState(false);
  // The rows above the cut while the rest is drawn, by key: a row leaving
  // from there never pulls one up out of the fold (it would leave one list
  // as it arrived in the other). Held until the fold has shut.
  const [above, setAbove] = useState<ReadonlySet<string> | null>(null);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const capped = rows.length > cap;
  const equal = equalRows ? '' : undefined;
  const folds = List === 'div';
  const listClass = cn('flex flex-col', ROW_GAPS[gap].list, className);
  const markers = { [LANE_ROWS]: '' };
  const settled = () => onSettled?.();
  const shared = { gap, sweeping };

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!folds) {
      setOpen(true);
      return;
    }
    setAbove(new Set(rows.slice(0, cap).map(rowKey)));
    setOpen(true);
  };
  const foot = capped ? (
    <ShowAll controls={id} open={open} toggle={toggle} total={rows.length} />
  ) : null;

  if (!folds) {
    const shown = open || !capped ? rows : rows.slice(0, cap);
    return (
      <>
        <List
          {...markers}
          className={listClass}
          data-equal-rows={equal}
          id={id}
        >
          <LeavingRows
            {...shared}
            arrive={!open}
            as="li"
            onSettled={settled}
            rows={shown}
            start={0}
          />
        </List>
        {foot}
      </>
    );
  }

  const isAbove = (row: ReactElement, index: number) =>
    above ? above.has(rowKey(row, index)) : index < cap;
  const first = rows.filter(isAbove);
  const rest = rows.filter((row, index) => !isAbove(row, index));
  // Each list speaks once the other has no row still leaving
  const firstSettled = () => {
    if (!stillLeaving(box.current?.querySelector('[data-rest]'))) {
      settled();
    }
  };
  const restSettled = () => {
    if (!stillLeaving(box.current?.firstElementChild)) {
      settled();
    }
  };
  const unpin = () => setAbove(null);
  // The fold stays while open, even with nothing past the cap (a show
  // hidden elsewhere): a fold leaving then would replay a stale row
  return (
    <>
      <div {...markers} id={id} ref={box}>
        <div className={listClass} data-equal-rows={equal}>
          <LeavingRows
            {...shared}
            arrive={above === null}
            as="div"
            onSettled={firstSettled}
            rows={first}
            start={0}
          />
        </div>
        <AnimatePresence initial={false} onExitComplete={unpin}>
          {open ? (
            <RestFold
              {...shared}
              arrive={false}
              className={listClass}
              equalRows={equal}
              key="rest"
              onSettled={restSettled}
              rows={rest}
              start={first.length}
            />
          ) : null}
        </AnimatePresence>
      </div>
      {foot}
    </>
  );
}
