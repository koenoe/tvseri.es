'use client';

import { AnimatePresence } from 'motion/react';
import { useCallback, useRef } from 'react';

import { useHiddenShows, useLoadLibraryIds } from '@/lib/marking/hooks';
import type { ShelfPageView } from '@/lib/profile/shelfPage';
import { type ShelfQuery, toSearch } from '@/lib/profile/shelfQuery';
import type { TileView } from '@/lib/profile/tileView';
import LoadAbove from '../../_components/blocks/LoadAbove';
import PaginationNotice from '../../_components/pagination/PaginationNotice';
import usePaginated from '../../_lib/pagination/usePaginated';
import useScrollAnchor from '../../_lib/pagination/useScrollAnchor';
import { earlierLabel } from '../_lib/earlierLabel';
import { SHELVES } from '../_lib/shelves';
import useShelfNavigation from '../_lib/useShelfNavigation';
import useShelfSelect from '../_lib/useShelfSelect';
import useShelfTiles from '../_lib/useShelfTiles';
import ActionBar, { SelectionStatus } from './ActionBar';
import AzRail from './AzRail';
import ShelfBody from './ShelfBody';
import ShelfGridEmpty from './ShelfGridEmpty';
import ShelfToolbar from './ShelfToolbar';
import { TileContext } from './tileContext';

const getId = (tile: TileView) => tile.id;

/**
 * A shelf's toolbar, grid and Select, on
 * its first page from the server. Sort, find, letter and filter live in the
 * URL: a change replaces it in a transition, the old grid dims (60%,
 * `aria-busy`) until the server's new first page lands, which reseeds the
 * list. Next pages load two rows before the end; after an A–Z jump the
 * row above loads the shows before with the reader's place held.
 */
export default function LibraryView({
  first,
  owner,
  query,
  username,
}: Readonly<{
  first: ShelfPageView;
  owner: boolean;
  query: ShelfQuery;
  username: string;
}>) {
  const { shelf } = query;
  const meta = SHELVES[shelf];
  const endpoint = `/api/u/${encodeURIComponent(username)}/library/${shelf}${toSearch(query)}`;

  const paged = usePaginated<TileView>({
    endpoint,
    getId,
    initialCursor: first.nextCursor,
    initialItems: first.items,
    initialPrevCursor: first.prevCursor,
    restoreKey: endpoint,
  });

  // Hide and Unhide from the Remote (and their Undo) change the store's
  // `hidden` at once: on Watching and Hidden it decides (useShelfTiles).
  const hidden = useHiddenShows();
  const { comeBack, leave, list, moving, settled, tiles } = useShelfTiles({
    first,
    hidden,
    items: paged.items,
    shelf,
    username,
  });

  // the viewer's library ids: a visitor's relation pills, and the owner's
  // W and F follow them at once (a tile leaves its shelf on the Remote's
  // close). Loaded, not read: the tiles read them, so a mark doesn't
  // re-render the grid
  useLoadLibraryIds();
  const { act, context, selecting, selection } = useShelfSelect({
    comeBack,
    leaveShelf: leave,
    owner,
    shelf,
    tiles,
    username,
  });
  const stopSelecting = useCallback(
    () => selection.getState().stop(),
    [selection],
  );
  const { find, onFilter, onJump, onSort, pending, railHref } =
    useShelfNavigation(query, stopSelecting);

  // A–Z: the rail, and the row that loads the shows above a jump
  const listRef = useRef<HTMLUListElement>(null);
  // Select's toolbar: focus goes back there as the select bar leaves
  const toolbarRef = useRef<HTMLDivElement>(null);
  const capture = useScrollAnchor(listRef, tiles);
  const firstIndex = paged.items.findIndex(
    (tile) => tile.id === first.items[0]?.id,
  );
  const above = Math.max(0, first.before - Math.max(0, firstIndex));
  const loadEarlier = () => void paged.loadBefore({ onPrepend: capture });

  const onSelect = () =>
    selecting ? stopSelecting() : selection.getState().start();
  const onAct = () => void act();
  const empty = tiles.length === 0;
  const canSelect = owner && meta.action !== null && !empty;
  const busy = pending || undefined;
  const emptyState = (
    <ShelfGridEmpty
      owner={owner}
      query={query}
      shelf={shelf}
      username={username}
    />
  );

  return (
    <TileContext value={context}>
      <div className="flex flex-col gap-5 md:gap-7">
        {/* scrolls away with the page (a sticky row under the
            sticky glass header looked wrong); Select's action bar sticks */}
        <div data-slot="library-toolbar" ref={toolbarRef}>
          <ShelfToolbar
            canSelect={canSelect}
            filter={query.with}
            filters={first.filters}
            find={find}
            onFilter={onFilter}
            onSelect={onSelect}
            onSort={onSort}
            selecting={selecting}
            shelf={shelf}
            sort={query.sort}
          />
        </div>
        <div
          aria-busy={busy}
          className="relative transition-opacity duration-200 aria-busy:opacity-60"
          data-slot="library-grid"
        >
          {query.sort === 'az' ? (
            <AzRail
              active={query.from}
              hrefOf={railHref}
              letters={first.letters}
              onJump={onJump}
            />
          ) : null}
          {paged.canLoadBefore && above > 0 ? (
            <LoadAbove className="mb-6" onLoad={loadEarlier}>
              {paged.beforeStatus === 'loading'
                ? 'Loading…'
                : earlierLabel(first.letters, tiles[0]?.initial, above)}
            </LoadAbove>
          ) : null}
          <ShelfBody
            empty={emptyState}
            hasMore={paged.canLoadMore}
            key={list}
            list={list}
            listRef={listRef}
            loadMore={paged.loadMore}
            moving={moving}
            settled={settled}
            shelf={shelf}
            status={paged.status}
            tiles={tiles}
          />
          <PaginationNotice onRetry={paged.loadMore} status={paged.status} />
        </div>
        {owner && meta.action ? (
          <SelectionStatus selection={selection} />
        ) : null}
        <AnimatePresence>
          {selecting && meta.action ? (
            <ActionBar
              action={meta.action}
              key="action-bar"
              onAct={onAct}
              onCancel={stopSelecting}
              returnFocusTo={toolbarRef}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </TileContext>
  );
}
