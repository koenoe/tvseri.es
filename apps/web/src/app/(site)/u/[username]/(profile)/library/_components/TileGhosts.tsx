import type { LibraryShelf } from '@tvseri.es/schemas';

import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { LIBRARY_CELL, LIBRARY_GRID } from './gridStyles';

/** A ghost's fill: the grid pulses as one layer, the shapes carry the fill only */
const FILL = GHOST_FILL;

const POSTER = cn('relative block aspect-2/3 rounded-10', FILL);

/** A 13px icon's ghost in a meta line */
function IconGhost() {
  return <span className={cn('size-[13px] shrink-0 rounded-full', FILL)} />;
}

/**
 * The ghost of one tile's meta line, shaped like the shelf's real one
 *: Watching's code badge and "5 to go", Watchlist's hours
 * and status, one icon and a date or state elsewhere.
 */
function MetaGhost({ shelf }: Readonly<{ shelf: LibraryShelf }>) {
  if (shelf === 'watching') {
    return (
      <>
        <span className={cn('h-5 w-[52px] shrink-0 rounded-6', FILL)} />
        <span className={cn('ml-auto h-3 w-[38%] rounded-6', FILL)} />
      </>
    );
  }
  if (shelf === 'watchlist') {
    return (
      <>
        <IconGhost />
        <span className={cn('h-3 w-[16%] rounded-6', FILL)} />
        <IconGhost />
        <span className={cn('h-3 w-[34%] rounded-6', FILL)} />
      </>
    );
  }
  return (
    <>
      <IconGhost />
      <span className={cn('h-3 w-[58%] rounded-6', FILL)} />
    </>
  );
}

/**
 * One ghost tile: the poster's box with the shelf's furniture (Watching's
 * 4px progress line, Favourites' heart), the 20px title row and the 20px
 * meta row, in the real tile's gaps.
 */
function GhostTile({ shelf }: Readonly<{ shelf: LibraryShelf }>) {
  return (
    <span
      aria-hidden="true"
      className="flex flex-col gap-2.5"
      data-placeholder="library-tile"
    >
      <span className={POSTER}>
        {shelf === 'watching' ? (
          <span
            className={cn('absolute inset-x-2 bottom-2 h-1 rounded-2', FILL)}
          />
        ) : null}
        {shelf === 'favourites' ? (
          <span
            className={cn(
              'absolute top-2 left-2 size-[26px] rounded-full',
              FILL,
            )}
          />
        ) : null}
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex h-5 items-center">
          <span className={cn('h-3 w-4/5 rounded-6', FILL)} />
        </span>
        <span className="flex h-5 items-center gap-2 overflow-hidden md:gap-3">
          <MetaGhost shelf={shelf} />
        </span>
      </span>
    </span>
  );
}

const GRID = cn(LIBRARY_GRID, 'animate-ghost');

/** A grid of ghost tiles in the real cells (a first page: 24; a next page: 5) */
export default function TileGhosts({
  count,
  placeholder,
  shelf,
}: Readonly<{ count: number; placeholder?: string; shelf: LibraryShelf }>) {
  return (
    <ul aria-hidden="true" className={GRID} data-placeholder={placeholder}>
      {Array.from({ length: count }, (_, index) => (
        <li className={LIBRARY_CELL} key={index}>
          <GhostTile shelf={shelf} />
        </li>
      ))}
    </ul>
  );
}
