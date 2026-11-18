import type { LibraryShelf } from '@tvseri.es/schemas';

import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { LIBRARY_CELL, LIBRARY_GRID } from './gridStyles';

/** A ghost's fill: the grid pulses as one layer, the shapes carry the fill only */
const FILL = GHOST_FILL;

const POSTER = cn('relative block aspect-2/3 rounded-10', FILL);
const ICON_GHOST = cn('size-[13px] shrink-0 rounded-full', FILL);
const CODE_GHOST = cn('h-5 w-[52px] shrink-0 rounded-6', FILL);
const TO_GO_GHOST = cn('ml-auto h-3 w-[38%] rounded-6', FILL);
const HOURS_GHOST = cn('h-3 w-[16%] rounded-6', FILL);
const STATUS_GHOST = cn('h-3 w-[34%] rounded-6', FILL);
const DATE_GHOST = cn('h-3 w-[58%] rounded-6', FILL);
const PROGRESS_GHOST = cn('absolute inset-x-2 bottom-2 h-1 rounded-2', FILL);
const HEART_GHOST = cn('absolute top-2 left-2 size-[26px] rounded-full', FILL);
const TITLE_GHOST = cn('h-3 w-4/5 rounded-6', FILL);

/** A 13px icon's ghost in a meta line */
function IconGhost() {
  return <span className={ICON_GHOST} />;
}

/**
 * The ghost of one tile's meta line, shaped like the shelf's real one:
 * Watching's code badge and "5 to go", Watchlist's hours and status, one
 * icon and a date or state elsewhere.
 */
function MetaGhost({ shelf }: Readonly<{ shelf: LibraryShelf }>) {
  if (shelf === 'watching') {
    return (
      <>
        <span className={CODE_GHOST} />
        <span className={TO_GO_GHOST} />
      </>
    );
  }
  if (shelf === 'watchlist') {
    return (
      <>
        <IconGhost />
        <span className={HOURS_GHOST} />
        <IconGhost />
        <span className={STATUS_GHOST} />
      </>
    );
  }
  return (
    <>
      <IconGhost />
      <span className={DATE_GHOST} />
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
        {shelf === 'watching' ? <span className={PROGRESS_GHOST} /> : null}
        {shelf === 'favourites' ? <span className={HEART_GHOST} /> : null}
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex h-5 items-center">
          <span className={TITLE_GHOST} />
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
