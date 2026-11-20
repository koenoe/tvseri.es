'use client';

import { formatGrouped } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';
import {
  type ReactNode,
  startTransition,
  useCallback,
  useId,
  useState,
} from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
import { HIT_Y } from '@/components/ui/button/hitArea';
import { visibleYears } from '@/lib/fold';

import ExpandButton, { type ExpandLayout } from './ExpandButton';

/** Rows before "Show all": a long-time member has twenty years and more */
const NEWEST = 5;

/**
 * The rows' 2px apart, inside each row rather than the list's gap, so a
 * revealed row's space folds with it instead of snapping
 */
const ROW = 'pt-0.5 first:pt-0';

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
 * so "Show all" opens them with no request; the rows it reveals fold open
 * (and shut again on Show fewer), as History's months do under each year.
 * When `reveal` moves to a year the fold hides (History's scroll), the
 * whole list opens at once and stays open: only the button folds it again.
 * Each row's content is the caller's; the list item is this list's.
 */
export default function YearsFold({
  className,
  reveal = null,
  rows,
  selected,
}: Readonly<{
  /** the list's classes (no gap: the rows carry their own 2px) */
  className: string;
  /** a year that must come into view when it changes (History's scroll) */
  reveal?: number | null;
  /** each year's row content, newest first */
  rows: ReadonlyArray<Readonly<{ year: number; row: ReactNode }>>;
  /** the year kept in view while folded */
  selected: number | null;
}>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);
  // only the button's press folds; a reveal opens the list at once
  const [asked, setAsked] = useState(false);
  const toggle = useCallback(() => {
    setAsked(true);
    startTransition(() => setOpen((value) => !value));
  }, []);
  const all = rows.map((item) => item.year);
  const folded = visibleYears(all, selected, NEWEST);
  if (reveal !== revealed) {
    setRevealed(reveal);
    if (reveal !== null && folded.hidden && !folded.years.includes(reveal)) {
      setAsked(false);
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
        <AnimatePresence custom={asked} initial={false}>
          {shown.map((item) =>
            !folded.hidden || folded.years.includes(item.year) ? (
              <li className={ROW} key={item.year}>
                {item.row}
              </li>
            ) : (
              <FoldPresence
                appear={asked}
                as="li"
                className={ROW}
                key={item.year}
                spacing
                whenAsked
              >
                {item.row}
              </FoldPresence>
            ),
          )}
        </AnimatePresence>
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
