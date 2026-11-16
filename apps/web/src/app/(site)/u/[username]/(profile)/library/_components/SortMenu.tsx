'use client';

import type { LibraryShelf, LibrarySort } from '@tvseri.es/schemas';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import {
  checkGlyph,
  chevronDownGlyph,
  sortGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { sortLabel, sortsOf } from '../_lib/shelves';
import { PILL } from './toolbarStyles';

/**
 * The sort pill and its menu of the shelf's sorts:
 * `menuitemradio`s, arrow keys move, Enter or Space picks, Escape closes and
 * returns to the pill. A dark panel in the toolbar's language.
 */
export default function SortMenu({
  onSort,
  shelf,
  sort,
}: Readonly<{
  onSort: (sort: LibrarySort) => void;
  shelf: LibraryShelf;
  sort: LibrarySort;
}>) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const pill = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const sorts = sortsOf(shelf);

  useEffect(() => {
    if (!open) {
      return;
    }
    const current = menu.current?.querySelector<HTMLElement>(
      '[aria-checked="true"]',
    );
    current?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !pill.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const close = () => {
    setOpen(false);
    pill.current?.focus();
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(menu.current?.querySelectorAll<HTMLElement>(
        '[role="menuitemradio"]',
      ) ?? []),
    ];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
    }
  };

  const pick = (next: LibrarySort) => {
    close();
    if (next !== sort) {
      onSort(next);
    }
  };

  const toggle = useCallback(() => setOpen((was) => !was), []);
  const onPillKey = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  }, []);

  const label = sortLabel(shelf, sort);
  return (
    <div className="relative">
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Sort: ${label}`}
        className={PILL}
        onClick={toggle}
        onKeyDown={onPillKey}
        ref={pill}
        type="button"
      >
        <Icon className="text-white/60" glyph={sortGlyph} size={16} />
        {label}
        <Icon className="text-white/60" glyph={chevronDownGlyph} size={16} />
      </button>
      {open ? (
        <div
          aria-label="Sort by"
          className="absolute top-full left-0 z-30 mt-2 flex min-w-[200px] flex-col gap-0.5 rounded-12 bg-[#0f1314] p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(255_255_255/0.1)]"
          id={menuId}
          onKeyDown={onMenuKey}
          ref={menu}
          role="menu"
        >
          {sorts.map((each) => (
            <SortItem
              key={each}
              on={each === sort}
              onPick={pick}
              sort={each}
              text={sortLabel(shelf, each)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** One sort in the menu: picks its own value */
function SortItem({
  on,
  onPick,
  sort,
  text,
}: Readonly<{
  on: boolean;
  onPick: (sort: LibrarySort) => void;
  sort: LibrarySort;
  text: string;
}>) {
  const pick = useCallback(() => onPick(sort), [onPick, sort]);
  return (
    <button
      aria-checked={on}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-8 px-3 text-left text-[13px] leading-5 font-medium outline-offset-[-2px] transition-colors',
        on ? 'text-white' : 'text-white/80 hover:bg-white/8',
      )}
      onClick={pick}
      role="menuitemradio"
      tabIndex={-1}
      type="button"
    >
      <span className="flex size-4 items-center justify-center">
        {on ? <Icon glyph={checkGlyph} size={16} /> : null}
      </span>
      {text}
    </button>
  );
}
