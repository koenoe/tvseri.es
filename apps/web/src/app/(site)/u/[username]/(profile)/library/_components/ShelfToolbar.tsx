'use client';

import type {
  LibraryFilter,
  LibraryShelf,
  LibrarySort,
} from '@tvseri.es/schemas';
import { formatGrouped } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useState,
} from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
import {
  checkGlyph,
  closeGlyph,
  heartGlyph,
  searchGlyph,
  sparkleGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import IconSwap from '@/components/ui/icon/IconSwap';
import cn from '@/lib/cn';

import { SHELVES } from '../_lib/shelves';
import type { FindText } from '../_lib/useFindText';
import SortMenu from './SortMenu';
import { CHIP, FIELD, PILL, PILL_ON, SELECT_PILL } from './toolbarStyles';

/**
 * The phone's Find field folds in under the row: it takes the column's 12px
 * gap back and draws its own, so the fold's clip never cuts a negative margin
 */
const FIND_FOLD = '-mt-3 md:hidden';

/** Select's marker (`SELECT_PILL`) */
const SELECT_MARK = { [SELECT_PILL]: '' };

export type ToolbarProps = Readonly<{
  shelf: LibraryShelf;
  sort: LibrarySort;
  /** Find's text and its handlers (`useShelfNavigation`) */
  find: FindText;
  /** Visitor: the filter chips and their counts; null for the owner */
  filters: Readonly<{ new: number; shared: number }> | null;
  filter: LibraryFilter | null;
  /** Owner on a shelf with an action: Select ↔ Done */
  canSelect: boolean;
  selecting: boolean;
  onSort: (sort: LibrarySort) => void;
  onFilter: (filter: LibraryFilter | null) => void;
  onSelect: () => void;
}>;

/**
 * "Find in Watchlist": a title prefix (`useFindText` asks for it); Escape
 * clears it. The desktop row and the phone's row share one text.
 */
function FindField({
  className,
  label,
  onChange,
  onClear,
  text,
}: Readonly<{
  className?: string;
  label: string;
  onChange: (text: string) => void;
  onClear: () => void;
  text: string;
}>) {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
    [onChange],
  );
  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape' && text) {
        event.stopPropagation();
        onClear();
      }
    },
    [onClear, text],
  );
  const fieldClass = cn(FIELD, className);
  return (
    <label className={fieldClass}>
      {/* contrast-exempt: the search icon */}
      <Icon className="shrink-0 text-white/50" glyph={searchGlyph} size={16} />
      <input
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-hidden max-md:text-[16px] placeholder:text-white/60 [&::-webkit-search-cancel-button]:hidden"
        maxLength={100}
        onChange={change}
        onKeyDown={keyDown}
        placeholder={label}
        type="search"
        value={text}
      />
    </label>
  );
}

/** A visitor's New to you / You both chip */
function FilterChip({
  count,
  filter,
  on,
  onFilter,
}: Readonly<{
  count: number;
  filter: LibraryFilter;
  on: boolean;
  onFilter: (filter: LibraryFilter | null) => void;
}>) {
  const fresh = filter === 'new';
  const toggle = useCallback(
    () => onFilter(on ? null : filter),
    [filter, on, onFilter],
  );
  const className = cn(
    CHIP,
    fresh
      ? on
        ? 'bg-[#b9ec95] text-[#152010]'
        : 'bg-[rgb(143_220_90/0.14)] text-[#b9ec95] shadow-[inset_0_0_0_1px_rgb(143_220_90/0.22)]'
      : on
        ? 'bg-white text-[#171717]'
        : 'bg-white/6 text-white/80',
  );
  const countClass = fresh
    ? 'opacity-70'
    : on
      ? 'text-[rgb(23_23_23/0.6)]'
      : 'text-white/60';
  const figureClass = cn('tabular-nums', countClass);
  return (
    <button
      aria-pressed={on}
      className={className}
      onClick={toggle}
      type="button"
    >
      <Icon glyph={fresh ? sparkleGlyph : heartGlyph} size={13} />
      {fresh ? 'New to you' : 'You both'}
      <span className={figureClass}>{formatGrouped(count)}</span>
    </button>
  );
}

/**
 * The shelf's toolbar: the sort pill, Find, and the
 * owner's Select ↔ Done or a visitor's New to you and You both. On a phone:
 * the pill, a Find button that folds the field open under the row, and
 * Select.
 */
export default function ShelfToolbar({
  canSelect,
  filter,
  filters,
  onFilter,
  find,
  onSelect,
  onSort,
  selecting,
  shelf,
  sort,
}: ToolbarProps) {
  const [finding, setFinding] = useState(find.text !== '');
  const findLabel = `Find in ${SHELVES[shelf].label}`;
  const toggleFinding = useCallback(() => setFinding((was) => !was), []);
  const findPillClass = cn(PILL, 'px-2.5 md:hidden', finding && PILL_ON);
  const findGlyph = finding ? closeGlyph : searchGlyph;
  const selectPillClass = cn(PILL, selecting && PILL_ON);
  const newOn = filter === 'new';
  const sharedOn = filter === 'shared';
  return (
    <div className="flex flex-col gap-3" ref={find.stopOnUnmount}>
      <div className="flex flex-wrap items-center gap-2.5">
        <SortMenu onSort={onSort} shelf={shelf} sort={sort} />
        <FindField
          className="max-md:hidden"
          label={findLabel}
          onChange={find.change}
          onClear={find.clear}
          text={find.text}
        />
        {filters ? (
          <>
            <FilterChip
              count={filters.new}
              filter="new"
              on={newOn}
              onFilter={onFilter}
            />
            <FilterChip
              count={filters.shared}
              filter="shared"
              on={sharedOn}
              onFilter={onFilter}
            />
          </>
        ) : null}
        <span className="flex-1" />
        <button
          aria-expanded={finding}
          aria-label={findLabel}
          className={findPillClass}
          onClick={toggleFinding}
          type="button"
        >
          <IconSwap glyph={findGlyph} size={16} />
        </button>
        {canSelect ? (
          <button
            {...SELECT_MARK}
            aria-pressed={selecting}
            className={selectPillClass}
            onClick={onSelect}
            type="button"
          >
            <Icon
              className="text-white/60 max-md:hidden"
              glyph={checkGlyph}
              size={16}
            />
            {selecting ? 'Done' : 'Select'}
          </button>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {finding ? (
          <FoldPresence className={FIND_FOLD} key="find">
            <div className="pt-3">
              <FindField
                className="w-full"
                label={findLabel}
                onChange={find.change}
                onClear={find.clear}
                text={find.text}
              />
            </div>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
