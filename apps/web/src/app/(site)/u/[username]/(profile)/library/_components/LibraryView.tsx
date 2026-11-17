'use client';

import type {
  LIBRARY_LETTERS,
  LibraryFilter,
  LibrarySort,
} from '@tvseri.es/schemas';
import { AnimatePresence } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useRef, useTransition } from 'react';

import MaxMotion from '@/components/motion/MaxMotion';
import { useHiddenShows, useLoadLibraryIds } from '@/lib/marking/hooks';
import useBulk from '@/lib/marking/useBulk';
import type { ShelfPageView } from '@/lib/profile/shelfPage';
import { type ShelfQuery, toSearch } from '@/lib/profile/shelfQuery';
import type { TileView } from '@/lib/profile/tileView';
import LoadAbove from '../../_components/blocks/LoadAbove';
import InfiniteScroll from '../../_components/pagination/InfiniteScroll';
import PaginationNotice from '../../_components/pagination/PaginationNotice';
import usePaginated from '../../_lib/pagination/usePaginated';
import useScrollAnchor from '../../_lib/pagination/useScrollAnchor';
import { bumpCounts } from '../../_lib/shelfCounts';
import { earlierLabel } from '../_lib/earlierLabel';
import { SHELVES } from '../_lib/shelves';
import useShelfSelect from '../_lib/useShelfSelect';
import useShelfTiles, { type LeaveReason } from '../_lib/useShelfTiles';
import ActionBar from './ActionBar';
import AzRail from './AzRail';
import { EAGER, LIBRARY_GRID } from './gridStyles';
import LibraryCell from './LibraryCell';
import ShelfGridEmpty from './ShelfGridEmpty';
import ShelfToolbar from './ShelfToolbar';
import TileGhosts from './TileGhosts';
import { TileContext } from './tileContext';

type Letter = (typeof LIBRARY_LETTERS)[number];

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
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
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
  // Each new first page is a new list (`list`): the old tiles go at once (no
  // exits) and the new ones fade in (the shelf switch).
  // `layout` only while something leaves (`moving`): never 300 tiles
  // measuring at rest.
  const hidden = useHiddenShows();
  const {
    comeBack,
    leave: leaveShelf,
    list,
    moving,
    settled,
    tiles,
  } = useShelfTiles({
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
  const { context, leave, selecting, selection } = useShelfSelect({
    leaveShelf,
    owner,
    shelf,
    tiles,
  });

  const go = useCallback(
    (next: ShelfQuery) => {
      selection.getState().stop();
      startTransition(() => {
        router.replace(`${pathname}${toSearch(next)}`, { scroll: false });
      });
    },
    [pathname, router, selection],
  );

  const bulk = useBulk();
  const act = async () => {
    const action = meta.action;
    if (!action) {
      return;
    }
    const picked = tiles.filter((tile) =>
      selection.getState().selected.has(tile.id),
    );
    const items = picked.map((tile) => ({
      addedAt: tile.addedAt,
      id: tile.id,
    }));
    const ids = picked.map((tile) => tile.id);
    selection.getState().stop();
    // Finished's action adds a heart; the others take the show off the shelf
    const reason =
      action.op === 'favourites-add' ? null : (action.op as LeaveReason);
    if (reason) {
      leave(ids, reason);
    } else {
      bumpCounts(username, {
        favourites: picked.filter((tile) => !tile.on.favourite).length,
      });
    }
    const result = await bulk(action.op, items, {
      onUndone: () => router.refresh(),
    });
    if (reason && result.failed.length > 0) {
      comeBack(result.failed, reason);
    }
  };

  // A–Z: the rail, and the row that loads the shows above a jump
  const listRef = useRef<HTMLUListElement>(null);
  const capture = useScrollAnchor(listRef, tiles);
  const firstIndex = paged.items.findIndex(
    (tile) => tile.id === first.items[0]?.id,
  );
  const above = Math.max(0, first.before - Math.max(0, firstIndex));
  const az = query.sort === 'az';
  const loadEarlier = () => void paged.loadBefore({ onPrepend: capture });
  const railHref = (letter: Letter) =>
    `${pathname}${toSearch({ ...query, from: letter, sort: 'az' })}`;

  const onFilter = (filter: LibraryFilter | null) =>
    go({ ...query, from: null, with: filter });
  const onFind = (q: string) => go({ ...query, from: null, q });
  const onSort = (sort: LibrarySort) => go({ ...query, from: null, sort });
  const stopSelecting = () => selection.getState().stop();
  const onSelect = () =>
    selecting ? stopSelecting() : selection.getState().start();
  const onAct = () => void act();

  const toolbarQuery = {
    filter: query.with,
    q: query.q,
    sort: query.sort,
  };
  const empty = tiles.length === 0;

  return (
    <TileContext value={context}>
      <div className="flex flex-col gap-5 md:gap-7">
        {/* scrolls away with the page (a sticky row under the
            sticky glass header looked wrong); Select's action bar sticks */}
        <div data-slot="library-toolbar">
          <ShelfToolbar
            canSelect={owner && meta.action !== null && !empty}
            filter={toolbarQuery.filter}
            filters={first.filters}
            onFilter={onFilter}
            onFind={onFind}
            onSelect={onSelect}
            onSort={onSort}
            q={toolbarQuery.q}
            selecting={selecting}
            shelf={shelf}
            sort={toolbarQuery.sort}
          />
        </div>
        <div
          aria-busy={pending || undefined}
          className="relative transition-opacity duration-200 aria-busy:opacity-60"
          data-slot="library-grid"
        >
          {az ? (
            <AzRail
              active={query.from}
              hrefOf={railHref}
              letters={first.letters}
            />
          ) : null}
          {paged.canLoadBefore && above > 0 ? (
            <LoadAbove className="mb-6" onLoad={loadEarlier}>
              {paged.beforeStatus === 'loading'
                ? 'Loading…'
                : earlierLabel(first.letters, tiles[0]?.initial, above)}
            </LoadAbove>
          ) : null}
          {empty ? (
            <ShelfGridEmpty
              owner={owner}
              query={query}
              shelf={shelf}
              username={username}
            />
          ) : (
            <InfiniteScroll
              hasMore={paged.canLoadMore}
              loadMore={paged.loadMore}
              margin="0px 0px 600px 0px"
            >
              <MaxMotion>
                <ul className={LIBRARY_GRID} key={list} ref={listRef}>
                  <AnimatePresence initial={list > 0} onExitComplete={settled}>
                    {tiles.map((tile, index) => (
                      <LibraryCell
                        eager={index < EAGER}
                        key={tile.id}
                        moving={moving}
                        tile={tile}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </MaxMotion>
              {paged.status === 'loading' ? (
                <div className="mt-7">
                  <TileGhosts count={5} shelf={shelf} />
                </div>
              ) : null}
            </InfiniteScroll>
          )}
          <PaginationNotice onRetry={paged.loadMore} status={paged.status} />
        </div>
        {selecting && meta.action ? (
          <ActionBar
            action={meta.action}
            onAct={onAct}
            onCancel={stopSelecting}
          />
        ) : null}
      </div>
    </TileContext>
  );
}
