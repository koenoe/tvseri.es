'use client';

import { formatGrouped } from '@tvseri.es/utils';
import {
  type ReactNode,
  startTransition,
  useCallback,
  useId,
  useState,
} from 'react';

import { HIT_Y } from '@/components/ui/button/hitArea';
import { visibleYears } from '@/lib/fold';

import ExpandButton, { type ExpandLayout } from './ExpandButton';

/** Rows before "Show all": a long-time member has twenty years and more */
const NEWEST = 5;

/**
 * The quiet foot of a capped list (the profile lanes' "Show all"), on the
 * rows' edges so its hover fill lines up with theirs
 */
const SHOW_ALL: ExpandLayout = {
  // 36px, 40 to the pointer: up to the row 2px above
  button: `${HIT_Y[2]} relative mt-0.5 flex h-9 cursor-pointer items-center justify-center gap-1 rounded-10 px-3 font-medium text-body-sm text-white/60 whitespace-nowrap transition-colors hover:bg-white/5 hover:text-white`,
  chevron: 13,
};

/**
 * A sidebar's years (Stats, History), folded to the newest five and the
 * `selected` year (`visibleYears`). The server or the parent drew every row,
 * so "Show all" opens them at once, with no request. When `reveal` moves to
 * a year the fold hides, the whole list opens and stays open: only the
 * button folds it again.
 */
export default function YearsFold({
  className,
  reveal = null,
  rows,
  selected,
}: Readonly<{
  /** the list's classes */
  className: string;
  /** a year that must come into view when it changes (History's scroll) */
  reveal?: number | null;
  /** each year's list item (keyed), newest first */
  rows: ReadonlyArray<Readonly<{ year: number; row: ReactNode }>>;
  /** the year kept in view while folded */
  selected: number | null;
}>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);
  const toggle = useCallback(() => {
    startTransition(() => setOpen((value) => !value));
  }, []);
  const all = rows.map((item) => item.year);
  const folded = visibleYears(all, selected, NEWEST);
  if (reveal !== revealed) {
    setRevealed(reveal);
    if (reveal !== null && folded.hidden && !folded.years.includes(reveal)) {
      setOpen(true);
    }
  }
  const shown =
    open || !folded.hidden
      ? rows
      : rows.filter((item) => folded.years.includes(item.year));
  const showAll = `Show all ${formatGrouped(rows.length)} years`;
  return (
    <>
      <ul className={className} id={listId}>
        {shown.map((item) => item.row)}
      </ul>
      {folded.hidden ? (
        <ExpandButton
          aria-controls={listId}
          label={showAll}
          layout={SHOW_ALL}
          onClick={toggle}
          open={open}
        />
      ) : null}
    </>
  );
}
