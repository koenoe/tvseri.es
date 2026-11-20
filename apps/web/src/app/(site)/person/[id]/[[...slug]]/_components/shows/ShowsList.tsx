'use client';

import { AnimatePresence } from 'motion/react';
import {
  memo,
  type ReactNode,
  useCallback,
  useId,
  useState,
  useTransition,
} from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
import ExpandButton, {
  type ExpandLayout,
} from '@/components/ui/fold/ExpandButton';
import ExpandChevron from '@/components/ui/icon/ExpandChevron';
import { userGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { foldOf } from '@/lib/fold';
import {
  FILTER_LABELS,
  SHOW_FILTERS,
  type ShowFilter,
  type ShowRowView,
} from '@/lib/person/shows';
import { fetchJson } from '@/lib/series/useCachedJson';
import { PERSON_SECTION } from '../layout';
import { useShowsFilter } from './filterStore';
import { LIST } from './listStyles';
import ShowRow from './ShowRow';
import styles from './shows.module.css';

/**
 * Six rows, then Show all expands in place, when the
 * app's fold rule says so (`lib/fold`: more than 3 hidden, 2 on a phone).
 */
const PREVIEW = 6;

/** The filtered list and its folds, at the section's own spacing */
const LIST_BOX = cn(styles.root, PERSON_SECTION);

/**
 * The self credits' list folds in under its toggle: it takes the section's
 * gap back and draws it inside, so the gap folds with the list
 */
const SELF_FOLD = '-mt-4 lg:-mt-6';
const SELF_LIST = cn(LIST, styles.root, 'pt-4 lg:pt-6');
const WIDE_BUTTON =
  'flex h-12 w-full cursor-pointer items-center rounded-12 px-4 text-body-sm font-medium text-white transition-colors';
const TOGGLE_BUTTON = cn(WIDE_BUTTON, 'gap-3 bg-white/4 text-left');

/** The full-width bar under the person's lists */
const EXPAND: ExpandLayout = {
  button: `${WIDE_BUTTON} justify-center gap-2 bg-white/5 hover:bg-white/8`,
  chevron: 15,
};

const FilterPill = memo(function FilterPill({
  id,
  on,
  onPick,
}: Readonly<{
  id: ShowFilter;
  on: boolean;
  onPick: (filter: ShowFilter) => void;
}>) {
  const pick = useCallback(() => onPick(id), [id, onPick]);
  const classes = cn(
    // 5px above and below (44px on a phone), half the 4px gap at the sides
    'relative flex h-[34px] shrink-0 after:absolute after:-inset-x-0.5 after:-inset-y-[5px] cursor-pointer items-center gap-2 rounded-full px-3.5 text-body-sm font-medium whitespace-nowrap transition-colors hover:text-white lg:h-8 lg:rounded-8',
    on
      ? 'bg-white/15 text-white'
      : 'bg-black/22 text-white/60 lg:bg-transparent',
  );
  return (
    <button aria-pressed={on} className={classes} onClick={pick} type="button">
      {FILTER_LABELS[id]}
    </button>
  );
});

FilterPill.displayName = 'FilterPill';

/** "As himself": the self credits, loaded when opened; they fold in once they arrive */
function SelfFold({
  count,
  label,
  personId,
}: Readonly<{
  count: number;
  label: string;
  personId: number;
}>) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ReadonlyArray<ShowRowView> | null>(null);
  const [pending, startLoad] = useTransition();
  const id = useId();
  const shown = open && rows !== null;
  const toggle = useCallback(() => {
    setOpen((value) => !value);
    if (!rows && !pending) {
      startLoad(async () => {
        try {
          setRows(
            await fetchJson<ReadonlyArray<ShowRowView>>(
              `/api/person/${personId}/self-credits`,
            ),
          );
        } catch (error) {
          // A rejection must not reach the section's error boundary, which
          // would replace the loaded list: the fold stays closed instead
          console.error('[person] [self credits] load failed', { error });
          setOpen(false);
        }
      });
    }
  }, [pending, personId, rows]);
  return (
    <>
      <button
        aria-busy={pending}
        aria-controls={shown ? id : undefined}
        aria-expanded={open}
        className={TOGGLE_BUTTON}
        onClick={toggle}
        type="button"
      >
        <Icon glyph={userGlyph} size={14} />
        {label}
        <span className="truncate font-normal text-white/60">
          {count} talk shows, award shows and documentaries
        </span>
        <ExpandChevron className="ml-auto" open={open} size={16} />
      </button>
      <AnimatePresence initial={false}>
        {shown ? (
          <FoldPresence className={SELF_FOLD} key="self">
            <div className={SELF_LIST} data-filter="all" id={id}>
              {rows.map((row) => (
                <ShowRow key={row.id} personId={personId} row={row} />
              ))}
            </div>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * The Shows list's island: the heading, the filter pills, Show all / Show
 * fewer and the self fold. The rows are the server's (`children`); the
 * filter is a data attribute on their root, so switching it re-renders
 * nothing. One number: the heading counts what the active filter lists, and
 * the pills carry none (a "Series 69" heading beside a "Series 27" pill reads
 * as a contradiction).
 */
export default function ShowsList({
  children,
  counts,
  personId,
  self,
  titleId,
}: Readonly<{
  children: ReactNode;
  /** Rows per filter: the heading's count and Show all N */
  counts: Readonly<Record<ShowFilter, number>>;
  personId: number;
  self: Readonly<{ count: number; label: string }>;
  /** The heading's id, the section's label */
  titleId: string;
}>) {
  const { filter, open, set } = useShowsFilter(personId);
  const onPick = useCallback(
    (next: ShowFilter) => set(personId, { filter: next }),
    [personId, set],
  );
  const toggleOpen = () => set(personId, { open: !open });
  const rows = counts[filter];
  const showAll = `Show all ${rows} series`;
  const fold = foldOf(rows - PREVIEW);
  const phoneOnly = fold === 'phone' ? 'lg:hidden' : undefined;
  const pills = SHOW_FILTERS.filter((id) => id === 'all' || counts[id] > 0);

  return (
    <>
      <SectionHead count={rows} id={titleId} title="Series" />
      <div
        aria-label="Filter series"
        className="-mx-gutter flex gap-1 overflow-x-auto px-gutter scrollbar-none max-lg:-my-1.5 max-lg:py-1.5 lg:mx-0 lg:self-start lg:rounded-12 lg:bg-black/22 lg:p-1.5"
        role="group"
      >
        {pills.map((id) => {
          const on = id === filter;
          return <FilterPill id={id} key={id} on={on} onPick={onPick} />;
        })}
      </div>
      <div
        className={LIST_BOX}
        data-filter={filter}
        data-fold={open ? 'none' : fold}
      >
        {children}
      </div>
      {open && self.count > 0 ? (
        <SelfFold count={self.count} label={self.label} personId={personId} />
      ) : null}
      {fold === 'none' ? null : (
        <ExpandButton
          className={phoneOnly}
          label={showAll}
          layout={EXPAND}
          onClick={toggleOpen}
          open={open}
        />
      )}
    </>
  );
}
