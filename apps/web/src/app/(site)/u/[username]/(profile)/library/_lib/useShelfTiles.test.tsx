// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import type { LibraryShelf } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';
import type { TileView } from '@/lib/profile/tileView';
import { useShelfCounts } from '../../_lib/shelfCounts';
import useShelfTiles from './useShelfTiles';

const COUNTS = {
  all: 10,
  favourites: 3,
  finished: 4,
  hidden: 1,
  watching: 2,
  watchlist: 5,
};

const tile = (id: number) => ({ id }) as TileView;
/** The server's first page: the same object until a new one arrives */
const FIRST = {};
const ids = (tiles: ReadonlyArray<TileView>) => tiles.map((entry) => entry.id);

type Props = Readonly<{
  first: object;
  hidden: Readonly<Record<number, boolean>>;
  items: ReadonlyArray<TileView>;
  shelf: LibraryShelf;
}>;

/** The shelf's tiles and the shelf counts the page shows, for one profile */
function setup(username: string, initial: Partial<Props> = {}) {
  const props: Props = {
    first: FIRST,
    hidden: {},
    items: [tile(1), tile(2), tile(3)],
    shelf: 'watchlist',
    ...initial,
  };
  return renderHook(
    (current: Props) => ({
      counts: useShelfCounts(username, COUNTS),
      shelf: useShelfTiles({ ...current, username }),
    }),
    { initialProps: props },
  );
}

describe('useShelfTiles: leave, come back, Undo', () => {
  it('a show that leaves is gone from the tiles and its counts move with it', () => {
    const { result } = setup('lena');
    act(() => result.current.shelf.leave([2], 'watchlist-remove'));
    expect(ids(result.current.shelf.tiles)).toEqual([1, 3]);
    expect(result.current.counts?.watchlist).toBe(4);
    expect(result.current.shelf.moving).toBe(true);
  });

  it('coming back (a failed bulk write) puts the tile and its counts back', () => {
    const { result } = setup('omar');
    act(() => result.current.shelf.leave([1, 3], 'finished'));
    expect(result.current.counts).toMatchObject({ finished: 6, watching: 0 });
    act(() => result.current.shelf.comeBack([3], 'finished'));
    expect(ids(result.current.shelf.tiles)).toEqual([2, 3]);
    expect(result.current.counts).toMatchObject({ finished: 5, watching: 1 });
  });

  it('Undo of a Remote Hide brings the tile back with its counts', () => {
    const { rerender, result } = setup('pia', { shelf: 'watching' });
    act(() => result.current.shelf.leave([2], 'hide'));
    // the Remote's Hide writes the store at once: Watching follows it
    rerender({
      first: FIRST,
      hidden: { 2: true },
      items: [tile(1), tile(2), tile(3)],
      shelf: 'watching',
    });
    expect(ids(result.current.shelf.tiles)).toEqual([1, 3]);
    expect(result.current.counts).toMatchObject({ hidden: 2, watching: 1 });
    // the toast's Undo
    rerender({
      first: FIRST,
      hidden: { 2: false },
      items: [tile(1), tile(2), tile(3)],
      shelf: 'watching',
    });
    expect(ids(result.current.shelf.tiles)).toEqual([1, 2, 3]);
    expect(result.current.counts).toMatchObject({ hidden: 1, watching: 2 });
  });

  it('Hidden shows what the store hid on this page, and drops what it brought back', () => {
    const { result } = setup('quin', {
      hidden: { 1: false, 4: true },
      items: [tile(1), tile(2), tile(4)],
      shelf: 'hidden',
    });
    expect(ids(result.current.shelf.tiles)).toEqual([2, 4]);
  });

  it('a new first page starts over: nothing has left it, and it is a new list', () => {
    const { rerender, result } = setup('rui');
    act(() => result.current.shelf.leave([1], 'watchlist-remove'));
    const list = result.current.shelf.list;
    rerender({
      first: {},
      hidden: {},
      items: [tile(1), tile(2)],
      shelf: 'watchlist',
    });
    expect(ids(result.current.shelf.tiles)).toEqual([1, 2]);
    expect(result.current.shelf.list).toBe(list + 1);
  });

  it('the move ends when the exits are done', () => {
    const { result } = setup('sol');
    act(() => result.current.shelf.leave([1], 'watchlist-remove'));
    act(() => result.current.shelf.settled());
    expect(result.current.shelf.moving).toBe(false);
  });
});
