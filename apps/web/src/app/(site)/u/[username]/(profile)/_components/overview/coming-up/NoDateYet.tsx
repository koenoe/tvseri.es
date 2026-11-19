'use client';

import { formatGrouped } from '@tvseri.es/utils';
import { type ReactNode, useId, useState } from 'react';
import Badge from '@/components/ui/button/Badge';
import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import { variantHourglassGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import CappedRows from '../../blocks/CappedRows';
import { LANE_CAPS } from '../../blocks/laneCaps';
import { NO_DATE_ROW } from './noDateRow';

const BUTTON = cn(
  NO_DATE_ROW,
  'cursor-pointer bg-white/3 text-left text-body-sm font-medium text-white transition-colors hover:bg-white/6',
);
const STATIC = cn(NO_DATE_ROW, 'bg-white/3 text-body-sm font-medium');

const GLYPH = (
  <Icon className="text-white/60" glyph={variantHourglassGlyph} size={14} />
);
const LABEL = (
  <span className="whitespace-nowrap text-white/85">No date yet</span>
);

/**
 * Coming up's last row: the renewed shows with no date, as one quiet line
 * with their count. Opened, it lists them under the button with "All
 * finished ›" beside it (a sibling, never inside the button). `alone`:
 * nothing is dated, so the row is the block: it opens itself with its
 * first three and "Show all N". With nothing to wait for it is a plain
 * line, nothing to open.
 */
export default function NoDateYet({
  alone,
  link,
  rows,
}: Readonly<{
  alone: boolean;
  /** "All finished ›" (left out on day zero: no dead ends) */
  link: ReactNode;
  rows: ReadonlyArray<ReactNode>;
}>) {
  const [open, setOpen] = useState(alone);
  const id = useId();
  const count = rows.length;
  if (count === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className={STATIC}>
          {GLYPH}
          {LABEL}
        </div>
        {link}
      </div>
    );
  }
  const toggle = () => setOpen((value) => !value);
  const button = (
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
      <ExpandChevron className="ml-auto text-white/60" open={open} size={13} />
    </button>
  );
  // opened by hand: every row; opened by itself: the lane's cap
  const cap = alone ? LANE_CAPS.noDateYet : count;
  const list = open ? (
    <div className="flex flex-col gap-2.5" id={id}>
      <CappedRows
        cap={cap}
        className="flex flex-col gap-2.5"
        equalRows
        rows={rows}
      />
    </div>
  ) : null;
  // one tree open or folded, so the button keeps its node and its focus
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        {button}
        {open ? link : null}
      </div>
      {list}
    </div>
  );
}
