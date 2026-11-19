// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShelfQuery } from '@/lib/profile/shelfQuery';
import useShelfNavigation from '../_lib/useShelfNavigation';
import ShelfToolbar from './ShelfToolbar';

/**
 * Find's text is the reader's own while they type: the URL's `q` lags
 * behind it (a navigation per pause), and a late `q` must never put
 * characters back. Only a `q` this field never asked for (back/forward,
 * a link) replaces the text. Sort, filter and the A–Z rail carry the text
 * as it stands, so a find still pausing is never dropped.
 */
const PATH = '/u/alex/library/watchlist';
const LABEL = 'Find in Watchlist';
const PAUSE = 150;

const replace = vi.fn<(href: string) => void>();
const router = { replace };
vi.mock('next/navigation', () => ({
  usePathname: () => PATH,
  useRouter: () => router,
}));

const noop = () => {};
let nav: ReturnType<typeof useShelfNavigation> | null = null;

function Shelf({ query }: Readonly<{ query: ShelfQuery }>) {
  const navigation = useShelfNavigation(query, noop);
  nav = navigation;
  return (
    <ShelfToolbar
      canSelect={false}
      filter={query.with}
      filters={null}
      find={navigation.find}
      onFilter={navigation.onFilter}
      onSelect={noop}
      onSort={navigation.onSort}
      selecting={false}
      shelf={query.shelf}
      sort={query.sort}
    />
  );
}

const at = (q: string, patch: Partial<ShelfQuery> = {}): ShelfQuery => ({
  from: null,
  q,
  shelf: 'watchlist',
  sort: 'newest',
  with: null,
  ...patch,
});

const shelf = (query: ShelfQuery) => <Shelf query={query} />;

const field = () =>
  screen.getAllByRole('searchbox', { name: LABEL })[0] as HTMLInputElement;

const type = (text: string) =>
  fireEvent.change(field(), { target: { value: text } });

const pause = () =>
  act(() => {
    vi.advanceTimersByTime(PAUSE);
  });

const navigation = () => nav as NonNullable<typeof nav>;

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Find', () => {
  it('asks for the text once the typing pauses', () => {
    render(shelf(at('')));
    type('b');
    type('br');
    expect(replace).not.toHaveBeenCalled();
    pause();
    expect(replace).toHaveBeenCalledExactlyOnceWith(`${PATH}?q=br`, {
      scroll: false,
    });
  });

  it('fast backspacing never brings characters back when the URL lags', () => {
    const view = render(shelf(at('')));
    type('abc');
    pause();
    type('ab');
    pause();
    type('a');
    type('');
    // the URL catches up with what was asked for earlier
    view.rerender(shelf(at('abc')));
    expect(field().value).toBe('');
    view.rerender(shelf(at('ab')));
    expect(field().value).toBe('');
    pause();
    expect(replace).toHaveBeenLastCalledWith(PATH, { scroll: false });
    view.rerender(shelf(at('')));
    expect(field().value).toBe('');
  });

  it('keeps typing that is ahead of the URL it asked for', () => {
    const view = render(shelf(at('')));
    type('br');
    pause();
    type('bre');
    view.rerender(shelf(at('br')));
    expect(field().value).toBe('bre');
  });

  it('follows back and forward: a q it never asked for', () => {
    const view = render(shelf(at('dune')));
    expect(field().value).toBe('dune');
    type('du');
    pause();
    view.rerender(shelf(at('du')));
    // Back to the entry before
    view.rerender(shelf(at('dune')));
    expect(field().value).toBe('dune');
    // and Back past the find
    view.rerender(shelf(at('')));
    expect(field().value).toBe('');
  });

  it('Escape clears the text and the find at once', () => {
    render(shelf(at('dune')));
    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(field().value).toBe('');
    expect(replace).toHaveBeenCalledExactlyOnceWith(PATH, { scroll: false });
  });

  it('a pause cut short by leaving asks for nothing', () => {
    const view = render(shelf(at('')));
    type('dune');
    view.unmount();
    pause();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not ask again for what the URL already has', () => {
    render(shelf(at('dune')));
    type('dune ');
    pause();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('Find while sorting, filtering or jumping', () => {
  it('a sort mid-pause carries the text and asks for it at once', () => {
    const view = render(shelf(at('')));
    type('dun');
    act(() => navigation().onSort('az'));
    expect(replace).toHaveBeenCalledExactlyOnceWith(`${PATH}?q=dun&sort=az`, {
      scroll: false,
    });
    pause();
    expect(replace).toHaveBeenCalledOnce();
    view.rerender(shelf(at('dun', { sort: 'az' })));
    expect(field().value).toBe('dun');
    type('dune');
    pause();
    expect(replace).toHaveBeenLastCalledWith(`${PATH}?q=dune&sort=az`, {
      scroll: false,
    });
  });

  it('a filter mid-pause carries the text', () => {
    render(shelf(at('')));
    type('dun');
    act(() => navigation().onFilter('new'));
    expect(replace).toHaveBeenCalledExactlyOnceWith(`${PATH}?q=dun&with=new`, {
      scroll: false,
    });
  });

  it('the rail links carry the text, and a jump settles the pause', () => {
    const view = render(shelf(at('', { sort: 'az' })));
    type('dun ');
    expect(navigation().railHref('d')).toBe(`${PATH}?from=d&q=dun&sort=az`);
    act(() => navigation().onJump());
    pause();
    expect(replace).not.toHaveBeenCalled();
    view.rerender(shelf(at('dun', { from: 'd', sort: 'az' })));
    expect(field().value).toBe('dun ');
  });
});
