'use client';

import { type FormEvent, useSyncExternalStore } from 'react';

import { searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { openSearch } from '@/lib/search/openSearch';

import { searchFromPath } from './searchFromPath';

const subscribe = () => () => {};
const fromLocation = () => searchFromPath(window.location.pathname);
const onServer = () => '';

/**
 * The 404's search field, prefilled from the broken URL.
 * The page is static, so the prefill is read from `location` after
 * hydration (empty on the server). The Enter chip sits 12px in, so the
 * field's corners are the chip's 6 plus 12.
 */
export default function NotFoundSearch() {
  const prefill = useSyncExternalStore(subscribe, fromLocation, onServer);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const query = new FormData(form).get('q');
    // the search overlay opens with the query (lib/search/openSearch)
    openSearch(form.querySelector('input'), String(query ?? ''));
  };

  return (
    <form
      className="flex h-12 w-full items-center gap-3 rounded-18 bg-white/10 pr-3 pl-3.5 text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)] backdrop-blur-md focus-within:shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.5)]"
      data-search-trigger=""
      onSubmit={submit}
      role="search"
    >
      <Icon glyph={searchGlyph} size={20} />
      <input
        aria-label="Search series and people"
        className="min-w-0 flex-1 bg-transparent text-body text-white outline-hidden placeholder:text-white/60"
        defaultValue={prefill}
        key={prefill}
        name="q"
        placeholder="Search series and people"
        type="search"
      />
      <kbd className="inline-flex h-6 items-center rounded-6 bg-white/12 px-2 font-sans text-caption font-medium text-white/80 max-md:hidden">
        Enter
      </kbd>
    </form>
  );
}
