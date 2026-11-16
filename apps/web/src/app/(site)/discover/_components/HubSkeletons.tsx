import { GHOST_FILL, GhostLine } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { GENRE_TILES } from '../_data/hubTiles';

/**
 * Blocks that hold a section's exact space while it streams (no layout
 * shift): each is the section's own frame (its title, grid, tile sizes and
 * the lines under each tile) with ghosts in place of its data.
 */

/**
 * The genre tiles (`Genres`): one 96px tile per `GENRE_TILES`, in full rows at every
 * width (no short last row). Fifteen tiles: five across on
 * desktop, three on a tablet, two on a phone 10 apart (like the lens grid) with the
 * first tile across both columns. A change to the number of tiles needs a new split.
 */
export const GENRE_GRID =
  'grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-5';

/** A genre tile's cell: the first one takes the phone's whole row */
export const GENRE_CELL = 'max-sm:first:col-span-2';

/**
 * A genre tile's box (`Genres`, the skeleton): name at the top, the count at
 * the bottom; on a phone the lens tiles' radius 12 and insets (12 × 10)
 */
export const GENRE_TILE =
  'flex h-24 flex-col justify-between rounded-12 bg-white/4 px-3 py-2.5 md:rounded-14 md:px-4.5 md:py-4';

/** A genre's name: two lines on a phone's narrow tile ("Action & Adventure"), one from md */
export const GENRE_NAME =
  'text-body font-semibold max-md:line-clamp-2 md:truncate';

/**
 * The genre tiles (`Genres`): the names are static, so they are drawn; the
 * count line is a ghost in its own line box.
 */
export function GenresSkeleton() {
  return (
    <div aria-busy className={GENRE_GRID} data-placeholder="genres">
      {GENRE_TILES.map((genre) => (
        <span className={cn(GENRE_TILE, GENRE_CELL)} key={genre.slug}>
          <b className={GENRE_NAME}>{genre.name}</b>
          <GhostLine className="h-5" look="loading" width="w-20" />
        </span>
      ))}
    </div>
  );
}

/** A Go deeper card's poster and the lines under it (desktop) */
function CardPosterGhost() {
  return (
    <span className="flex flex-col gap-2 xl:gap-3">
      <span
        className={cn('block aspect-2/3 rounded-(--tile-radius)', GHOST_FILL)}
      />
      <span className="flex flex-col gap-2 max-xl:hidden">
        <GhostLine className="h-6" inPulse look="loading" width="w-3/4" />
        <GhostLine className="h-5" inPulse look="loading" width="w-1/2" />
      </span>
    </span>
  );
}

/**
 * A Go deeper card while it loads (`GoDeeperCard`): its frame, the from and
 * to lines (desktop: the left column with its arrow), three posters with
 * their lines and the "All" tile, the phone's button; ghosts in the text's
 * line boxes. Inside a pulsing row: the shapes don't pulse on their own.
 */
export function GoDeeperCardGhost() {
  return (
    <span className="flex h-full flex-col gap-3.5 rounded-16 bg-black/22 p-4 xl:grid xl:grid-cols-[290px_minmax(0,1fr)] xl:gap-8 xl:p-6">
      <span className="flex items-end justify-between gap-3 xl:hidden">
        <span className="flex w-1/2 flex-col gap-1.5">
          <GhostLine className="h-5" inPulse look="loading" width="w-2/3" />
          <GhostLine className="h-6" inPulse look="loading" width="w-full" />
        </span>
        <span className="flex w-1/2 flex-col gap-1.5 border-l-2 border-white/10 pl-3">
          <GhostLine className="h-5" inPulse look="loading" width="w-1/2" />
          <GhostLine className="h-7" inPulse look="loading" width="w-3/4" />
        </span>
      </span>
      <span className="relative -m-3 flex flex-col gap-6 p-4 pb-16 max-xl:hidden">
        <span className="flex flex-col gap-3">
          <GhostLine className="h-5" inPulse look="loading" width="w-24" />
          <GhostLine className="h-6" inPulse look="loading" width="w-40" />
          <GhostLine className="h-6" inPulse look="loading" width="w-full" />
        </span>
        <span className="flex flex-col gap-3 border-l-2 border-white/10 pl-4">
          <GhostLine className="h-5" inPulse look="loading" width="w-16" />
          <GhostLine className="h-6" inPulse look="loading" width="w-32" />
          <GhostLine className="h-5" inPulse look="loading" width="w-20" />
        </span>
        <span
          className={cn(
            'absolute right-4 bottom-4 size-9 rounded-full',
            GHOST_FILL,
          )}
        />
      </span>
      <span className="grid grid-cols-3 gap-2.5 [--tile-radius:8px] xl:grid-cols-4 xl:gap-5 xl:[--tile-radius:10px]">
        <CardPosterGhost />
        <CardPosterGhost />
        <CardPosterGhost />
        <span
          className={cn('aspect-2/3 rounded-10 max-xl:hidden', GHOST_FILL)}
        />
      </span>
      <span
        className={cn('h-9 w-40 self-start rounded-full xl:hidden', GHOST_FILL)}
      />
    </span>
  );
}
