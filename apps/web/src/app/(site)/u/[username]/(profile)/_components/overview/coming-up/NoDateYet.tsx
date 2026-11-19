'use client';

import { formatGrouped } from '@tvseri.es/utils';
import { type ReactNode, useId, useState } from 'react';
import Badge from '@/components/ui/button/Badge';
import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import { variantHourglassGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { ShowMore, useSteps } from '../../blocks/CappedRows';
import { LANE_CAPS } from '../../blocks/laneCaps';
import { NO_DATE_ROW } from './noDateRow';

const BUTTON = cn(
  NO_DATE_ROW,
  'cursor-pointer bg-white/3 text-left text-body-sm font-medium text-white transition-colors hover:bg-white/6',
);
const STATIC = cn(NO_DATE_ROW, 'bg-white/3 text-body-sm font-medium');

/** How many more each press of the foot reveals (and the first, opened by hand) */
const STEP = 10;

const GLYPH = (
  <Icon className="text-white/60" glyph={variantHourglassGlyph} size={14} />
);
const LABEL = (
  <span className="whitespace-nowrap text-white/85">No date yet</span>
);

/** The opened list: its first rows, then ten more per press of its foot */
function NoDateRows({
  first,
  id,
  rows,
}: Readonly<{
  first: number;
  id: string;
  rows: ReadonlyArray<ReactNode>;
}>) {
  const {
    id: listId,
    listRef,
    more,
    next,
    shown,
  } = useSteps(rows.length, first, STEP);
  const visible = rows.slice(0, shown);
  return (
    <div className="flex flex-col gap-2.5" id={id}>
      <div
        className="flex flex-col gap-2.5"
        data-equal-rows=""
        id={listId}
        ref={listRef}
      >
        {visible}
      </div>
      {next > 0 ? (
        <ShowMore controls={listId} count={next} more={more} />
      ) : null}
    </div>
  );
}

/**
 * Coming up's last row: the renewed shows with no date, as one quiet line
 * with their count. Opened, it lists the first ten under the button and
 * "Show 10 more" until all show; folding it starts over. `alone`: nothing
 * is dated, so the row is the block: it opens itself with its first three.
 * With nothing to wait for it is a plain line, nothing to open.
 */
export default function NoDateYet({
  alone,
  rows,
}: Readonly<{
  alone: boolean;
  rows: ReadonlyArray<ReactNode>;
}>) {
  const [open, setOpen] = useState(alone);
  const id = useId();
  const count = rows.length;
  if (count === 0) {
    return (
      <div className={STATIC}>
        {GLYPH}
        {LABEL}
      </div>
    );
  }
  const toggle = () => setOpen((value) => !value);
  const first = alone ? LANE_CAPS.noDateYet : STEP;
  // one tree open or folded, so the button keeps its node and its focus
  return (
    <div className="flex flex-col gap-2.5">
      <button
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        className={BUTTON}
        onClick={toggle}
        type="button"
      >
        {GLYPH}
        {LABEL}
        <Badge className="shrink-0" variant="count">
          {formatGrouped(count)}
        </Badge>
        {open ? null : (
          <span className="min-w-0 truncate text-caption font-normal text-white/60 max-md:hidden">
            Renewed, no date announced
          </span>
        )}
        <ExpandChevron
          className="ml-auto text-white/60"
          open={open}
          size={13}
        />
      </button>
      {open ? <NoDateRows first={first} id={id} rows={rows} /> : null}
    </div>
  );
}
