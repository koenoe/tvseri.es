'use client';

import { type MouseEvent, useCallback } from 'react';
import { searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { openSearch } from '@/lib/search/openSearch';
import { useHeaderStore } from './HeaderStoreProvider';
import { HEADER_ICON_BUTTON } from './headerIconButton';

/**
 * Opens the search overlay (see `openSearch`). Live under the open menu
 * too: the menu closes at once, without waiting for
 * its exit, and search grows from this button.
 */
export default function SearchButton() {
  const closeMenu = useHeaderStore((state) => state.closeMenu);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      closeMenu();
      openSearch(event.currentTarget);
    },
    [closeMenu],
  );

  return (
    <button
      aria-label="Search"
      className={HEADER_ICON_BUTTON}
      data-search-trigger=""
      onClick={handleClick}
      type="button"
    >
      {/* 18px on phones */}
      <Icon className="max-md:size-4.5" glyph={searchGlyph} size={20} />
    </button>
  );
}
