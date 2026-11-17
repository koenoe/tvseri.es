'use client';

import type {
  LibraryFilter,
  LibraryShelf,
  LibrarySort,
} from '@tvseri.es/schemas';
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  checkGlyph,
  closeGlyph,
  heartGlyph,
  searchGlyph,
  sparkleGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { formatGrouped } from '@/lib/formatCount';
import { SHELVES } from '../_lib/shelves';
import SortMenu from './SortMenu';
import { CHIP, FIELD, PILL, PILL_ON } from './toolbarStyles';

/** Find waits this long after the last key (like search) */
const FIND_DEBOUNCE_MS = 150;

export type ToolbarProps = Readonly<{
  shelf: LibraryShelf;
  sort: LibrarySort;
  q: string;
  /** Visitor: the filter chips and their counts; null for the owner */
  filters: Readonly<{ new: number; shared: number }> | null;
  filter: LibraryFilter | null;
  /** Owner on a shelf with an action: Select ↔ Done */
  canSelect: boolean;
  selecting: boolean;
  onSort: (sort: LibrarySort) => void;
  onFind: (q: string) => void;
  onFilter: (filter: LibraryFilter | null) => void;
  onSelect: () => void;
}>;

function useDebounced(value: string, onChange: (value: string) => void) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => latest.current(value), FIND_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
}

/**
 * "Find in Watchlist" (`.fld`): a title prefix, 150 ms after the last key;
 * Escape clears it
 */
function FindField({
  className,
  label,
  onFind,
  q,
}: Readonly<{
  className?: string;
  label: string;
  onFind: (q: string) => void;
  q: string;
}>) {
  const [text, setText] = useState(q);
  const [seen, setSeen] = useState(q);
  if (seen !== q) {
    setSeen(q);
    setText(q);
  }
  useDebounced(text, (value) => {
    if (value.trim() !== q) {
      onFind(value.trim());
    }
  });
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setText(event.target.value),
    [],
  );
  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape' && text) {
        event.stopPropagation();
        setText('');
      }
    },
    [text],
  );
  const fieldClass = cn(FIELD, className);
  return (
    <label className={fieldClass}>
      {/* contrast-exempt: the search icon */}
      <Icon className="shrink-0 text-white/50" glyph={searchGlyph} size={16} />
      <input
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none max-md:text-[16px] placeholder:text-white/60 [&::-webkit-search-cancel-button]:hidden"
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
 * the pill, a Find button that opens the field under the row, and Select.
 */
export default function ShelfToolbar({
  canSelect,
  filter,
  filters,
  onFilter,
  onFind,
  onSelect,
  onSort,
  q,
  selecting,
  shelf,
  sort,
}: ToolbarProps) {
  const [finding, setFinding] = useState(q !== '');
  const findLabel = `Find in ${SHELVES[shelf].label}`;
  const toggleFinding = useCallback(() => setFinding((was) => !was), []);
  const findPillClass = cn(PILL, 'px-2.5 md:hidden', finding && PILL_ON);
  const selectPillClass = cn(PILL, selecting && PILL_ON);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <SortMenu onSort={onSort} shelf={shelf} sort={sort} />
        <FindField
          className="max-md:hidden"
          label={findLabel}
          onFind={onFind}
          q={q}
        />
        {filters ? (
          <>
            <FilterChip
              count={filters.new}
              filter="new"
              on={filter === 'new'}
              onFilter={onFilter}
            />
            <FilterChip
              count={filters.shared}
              filter="shared"
              on={filter === 'shared'}
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
          <Icon glyph={finding ? closeGlyph : searchGlyph} size={16} />
        </button>
        {canSelect ? (
          <button
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
      {finding ? (
        <FindField
          className="w-full md:hidden"
          label={findLabel}
          onFind={onFind}
          q={q}
        />
      ) : null}
    </div>
  );
}
