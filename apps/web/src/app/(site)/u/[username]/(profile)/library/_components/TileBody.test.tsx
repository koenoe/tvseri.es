// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import type { LibraryShelf } from '@tvseri.es/schemas';
import { useLayoutEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { MarkingStoreApi } from '@/lib/marking/store';
import type { TileView } from '@/lib/profile/tileView';
import { createSelectionStore } from '../_lib/selection';
import { Poster } from './TileBody';
import { TileContext, type TileContextValue } from './tileContext';

const tile = (heart: boolean): TileView => ({
  addedAt: 0,
  code: null,
  hasAired: true,
  heart,
  historySeason: 1,
  id: 7,
  initial: 'B',
  line: null,
  meta: [],
  on: {
    favourite: heart,
    finished: true,
    hidden: false,
    watching: false,
    watchlist: false,
  },
  posterImage: '',
  slug: 'the-bear',
  title: 'The Bear',
  undated: false,
});

let api: MarkingStoreApi | null = null;
function Grab() {
  const store = useMarkingStoreApi();
  useLayoutEffect(() => {
    api = store;
  }, [store]);
  return null;
}

function setup(served: TileView, shelf: LibraryShelf, owner = true) {
  const context: TileContextValue = {
    leave: () => {},
    longPress: () => {},
    owner,
    pick: () => {},
    selection: createSelectionStore(),
    shelf,
  };
  render(
    <MarkingProvider>
      <Grab />
      <TileContext value={context}>
        <Poster eager={false} sizes="100px" tile={served} />
      </TileContext>
    </MarkingProvider>,
  );
  return api as MarkingStoreApi;
}

const favourites = (store: MarkingStoreApi, ids: number[]) =>
  act(() => {
    store.getState().setLibrary({
      ids: { favorites: ids, inProgress: [], watched: [7], watchlist: [] },
      status: 'ready',
    });
  });

const heart = () => screen.queryByRole('img', { name: 'Favourite' });

afterEach(cleanup);

describe('Poster heart', () => {
  it('shows the served heart before the library ids load', () => {
    setup(tile(true), 'finished');
    expect(heart()).not.toBeNull();
  });

  it('follows a favourite toggled on another shelf at once', () => {
    const store = setup(tile(false), 'finished');
    expect(heart()).toBeNull();
    favourites(store, [7]);
    expect(heart()).not.toBeNull();
    favourites(store, []);
    expect(heart()).toBeNull();
  });

  it('wears no heart on Favourites, even for a favourite', () => {
    const store = setup(tile(false), 'favourites');
    favourites(store, [7]);
    expect(heart()).toBeNull();
  });

  it("a visitor never sees the owner's heart", () => {
    const store = setup(tile(true), 'watchlist', false);
    favourites(store, [7]);
    expect(heart()).toBeNull();
  });
});
