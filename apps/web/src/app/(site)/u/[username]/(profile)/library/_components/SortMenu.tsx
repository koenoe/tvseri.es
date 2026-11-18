'use client';

import type { LibraryShelf, LibrarySort } from '@tvseri.es/schemas';
import { useCallback } from 'react';

import {
  checkGlyph,
  chevronDownGlyph,
  sortGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { MENU_ITEM, MENU_PANEL, useMenu } from '@/components/ui/menu/useMenu';
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
  const {
    close,
    menu,
    menuId,
    onMenuKey,
    onTriggerKey,
    open,
    toggle,
    trigger,
  } = useMenu({
    focus: '[aria-checked="true"]',
    items: '[role="menuitemradio"]',
  });
  const sorts = sortsOf(shelf);

  const pick = (next: LibrarySort) => {
    close();
    if (next !== sort) {
      onSort(next);
    }
  };

  const label = sortLabel(shelf, sort);
  const pillLabel = `Sort: ${label}`;
  return (
    <div className="relative">
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={pillLabel}
        className={PILL}
        onClick={toggle}
        onKeyDown={onTriggerKey}
        ref={trigger}
        type="button"
      >
        <Icon className="text-white/60" glyph={sortGlyph} size={16} />
        {label}
        <Icon className="text-white/60" glyph={chevronDownGlyph} size={16} />
      </button>
      {open ? (
        <div
          aria-label="Sort by"
          className={MENU_PANEL}
          id={menuId}
          onKeyDown={onMenuKey}
          ref={menu}
          role="menu"
        >
          {sorts.map((each) => {
            const on = each === sort;
            const text = sortLabel(shelf, each);
            return (
              <SortItem
                key={each}
                on={on}
                onPick={pick}
                sort={each}
                text={text}
              />
            );
          })}
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
  const itemClass = cn(
    MENU_ITEM,
    on ? 'text-white' : 'text-white/80 hover:bg-white/8',
  );
  return (
    <button
      aria-checked={on}
      className={itemClass}
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
