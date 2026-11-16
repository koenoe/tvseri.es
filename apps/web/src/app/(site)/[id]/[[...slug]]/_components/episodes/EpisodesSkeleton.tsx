/**
 * Placeholders that hold the section's space while the viewer's season
 * streams in, another season loads, or the whole page is still a shell: the
 * header (title, facts, line) and the wall as an 8-episode season with nothing
 * watched draws it (Focus and seven tiles, nothing folded; Focus, one tile and
 * "Show all N episodes" on a phone), each tile ghosted from its own layout.
 */
import { PULSE } from '@/components/ui/ghost/ghosts';
import {
  GHOST_FILL,
  GHOST_LOOK,
  GhostLine,
} from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import {
  FOCUS,
  FOCUS_BODY,
  FOCUS_STILL,
  TILE_BODY,
  TILE_FRAME,
  TILE_STILL,
  WALL_GRID,
} from './tileLayout';

const SELECT_GHOST = cn(
  'h-8 w-[106px] rounded-12 md:h-10 md:w-[131px]',
  GHOST_FILL,
);
const FACTS_GHOST = cn('h-5 w-[281px] rounded-6 md:w-72', GHOST_FILL);
/** The header's one pulsing layer */
const HEADER_GHOST = cn('flex flex-wrap items-center gap-x-6 gap-y-2', PULSE);

/** The tiles after Focus in the default: an 8-episode season, nothing watched. */
const TILES = [0, 1, 2, 3, 4, 5, 6] as const;

/** The Focus tile's lines: Next up, the title, the overview, date, what's left. */
function FocusGhost() {
  const look = FOCUS.tall;
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-12',
        GHOST_FILL,
        look.frame,
      )}
    >
      <div className={cn(FOCUS_STILL, GHOST_FILL, look.still)} />
      <div className={cn(FOCUS_BODY, look.body)}>
        <GhostLine className="h-5" inPulse look="loading" width="w-32" />
        <GhostLine className="h-7 md:h-8" inPulse look="loading" width="w-56" />
        <span className="flex flex-col">
          <GhostLine className="h-6" inPulse look="loading" width="w-full" />
          <GhostLine className="h-6" inPulse look="loading" width="w-5/6" />
          <GhostLine
            className="h-6 max-md:hidden"
            inPulse
            look="loading"
            width="w-2/3"
          />
        </span>
        <GhostLine className="h-5" inPulse look="loading" width="w-40" />
        <GhostLine className="h-5" inPulse look="loading" width="w-48" />
      </div>
    </div>
  );
}

/** An episode tile's lines: number and title, two of overview, date · runtime. */
function TileGhost({ phoneHidden }: Readonly<{ phoneHidden: boolean }>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-12',
        GHOST_FILL,
        TILE_FRAME,
        phoneHidden && 'max-md:hidden',
      )}
    >
      <div className={cn(TILE_STILL, GHOST_FILL)} />
      <div className={TILE_BODY}>
        <GhostLine className="h-7" inPulse look="loading" width="w-2/3" />
        <span className="flex flex-col">
          <GhostLine className="h-6" inPulse look="loading" width="w-full" />
          <GhostLine className="h-6" inPulse look="loading" width="w-3/4" />
        </span>
        <GhostLine className="h-5" inPulse look="loading" width="w-36" />
      </div>
    </div>
  );
}

/**
 * The wall's slots: ghosted tiles while loading, dashed outlines
 * of the same slots when the season failed (`EpisodesError` lays its card
 * over them).
 */
export function WallSkeleton({
  look = 'loading',
}: Readonly<{ look?: 'failed' | 'loading' }>) {
  if (look === 'failed') {
    const slot = `rounded-12 ${GHOST_LOOK.failed}`;
    return (
      <div aria-hidden="true" className={WALL_GRID}>
        <div className={cn(slot, 'h-103', FOCUS.tall.frame)} />
        {TILES.map((tile) => (
          <div
            className={cn(
              slot,
              'h-89',
              TILE_FRAME,
              tile > 0 && 'max-md:hidden',
            )}
            key={tile}
          />
        ))}
        <ShowMoreGhost look="failed" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={cn(WALL_GRID, 'animate-ghost')}>
      <FocusGhost />
      {TILES.map((tile) => (
        <TileGhost key={tile} phoneHidden={tile > 0} />
      ))}
      <ShowMoreGhost look="loading" />
    </div>
  );
}

/**
 * The phone's "Show all 13 episodes" pill (a two-digit season; the desktop
 * shows the whole season): a flat ghost pill inside the pulsing wall, or the
 * failed wall's dashed outline.
 */
function ShowMoreGhost({ look }: Readonly<{ look: 'failed' | 'loading' }>) {
  const pill = cn(
    'h-11 w-[185px] rounded-full',
    look === 'failed' ? GHOST_LOOK.failed : GHOST_FILL,
  );
  return (
    <div className="col-span-full flex min-h-14 items-center justify-center md:hidden">
      <span className={pill} />
    </div>
  );
}

/** The section's header as `SeasonHeader` draws it: select, facts, the line. */
function SeasonHeaderSkeleton() {
  return (
    <div className={HEADER_GHOST}>
      <div className={SELECT_GHOST} />
      <div className={FACTS_GHOST} />
      <SeasonLineGhost inPulse />
    </div>
  );
}

/**
 * The season line while its episodes load: a 4px track where the line's
 * segments will sit (its 28px box, `seasonLine.module.css`), full width
 * under the select and facts. The page's shell and a season switch draw the
 * same one. `inPulse`: inside a block that already pulses (the shell's header).
 */
export function SeasonLineGhost({
  inPulse = false,
}: Readonly<{ inPulse?: boolean }>) {
  const track = cn('h-1 rounded-2', GHOST_FILL, !inPulse && PULSE);
  return (
    <div aria-hidden="true" className="h-7 basis-full py-3">
      <div className={track} />
    </div>
  );
}

export default function EpisodesSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading episodes"
      data-placeholder="episodes"
    >
      <SeasonHeaderSkeleton />
      <WallSkeleton />
    </div>
  );
}
