'use client';

import { formatGrouped } from '@tvseri.es/utils';
import {
  type ReactNode,
  startTransition,
  useCallback,
  useId,
  useState,
} from 'react';

import ExpandButton, {
  type ExpandLayout,
} from '@/components/ui/fold/ExpandButton';

import { visibleYears } from './model';
import { useSelectedYear } from './YearLink';

/** Rows before "Show all": a long-time member has twenty years and more */
const NEWEST = 5;

/**
 * The quiet foot of a capped list (the profile lanes' "Show all"), on the
 * rows' edges so its hover fill lines up with theirs
 */
const SHOW_ALL: ExpandLayout = {
  button:
    'mt-0.5 flex h-9 cursor-pointer items-center justify-center gap-1 rounded-10 px-3 font-medium text-body-sm text-white/60 whitespace-nowrap transition-colors hover:bg-white/5 hover:text-white',
  chevron: 13,
};

/**
 * The sidebar's Years rows, folded to the newest five and the page's year
 * (`visibleYears`), which follows the URL like the highlight does. The
 * server drew every row, so "Show all" opens them at once, with no request.
 */
export default function YearsFold({
  className,
  rows,
}: Readonly<{
  /** the list's classes */
  className: string;
  rows: ReadonlyArray<Readonly<{ year: number; row: ReactNode }>>;
}>) {
  const listId = useId();
  const selected = useSelectedYear();
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => {
    startTransition(() => setOpen((value) => !value));
  }, []);
  const all = rows.map((item) => item.year);
  const folded = visibleYears(all, selected, NEWEST);
  const shown =
    open || !folded.hidden
      ? rows
      : rows.filter((item) => folded.years.includes(item.year));
  const showAll = `Show all ${formatGrouped(rows.length)} years`;
  return (
    <>
      <ul className={className} id={listId}>
        {shown.map((item) => (
          <li key={item.year}>{item.row}</li>
        ))}
      </ul>
      {folded.hidden ? (
        <ExpandButton
          aria-controls={listId}
          className="-mx-3"
          label={showAll}
          layout={SHOW_ALL}
          onClick={toggle}
          open={open}
        />
      ) : null}
    </>
  );
}
