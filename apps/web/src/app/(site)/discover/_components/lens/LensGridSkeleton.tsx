import { RowErrorCard } from '@/components/ui/row/RowError';
import { GHOST_LOOK, GhostLine } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { LENS_GRID } from './tileStyles';

const SLOTS = [0, 1, 2, 3, 4];

const FIRST =
  'col-span-2 h-47.5 rounded-12 md:col-span-1 md:row-span-2 md:h-auto md:rounded-14';
const REST = 'h-29.5 rounded-12 md:h-auto md:rounded-14';

// the card places itself from the row insets: the grid has none
const NO_INSET = 'contents [--row-end:0px] [--row-start:0px]';

/**
 * A tile's name and meta line while it loads, where `LensTileBody` puts
 * them (bottom left; the big tile's larger), each a bar in its line box
 */
function TileTextGhost({ first }: Readonly<{ first: boolean }>) {
  const frameClass = cn(
    'absolute right-3 bottom-2.5 left-3 flex flex-col gap-1 md:right-5.5 md:bottom-5 md:left-5.5 md:gap-2.5',
    first && 'md:bottom-7.5 md:left-8 md:gap-3.5',
  );
  return (
    <span className={frameClass}>
      <GhostLine
        className={first ? 'h-7 md:h-10' : 'h-7 md:h-8'}
        inPulse
        look="loading"
        width={first ? 'w-1/2' : 'w-3/4'}
      />
      <GhostLine className="h-5" inPulse look="loading" width="w-1/3" />
    </span>
  );
}

/** The grid's five tile slots, in the tiles' exact places */
function LensGridSlots({ look }: Readonly<{ look: 'failed' | 'loading' }>) {
  return SLOTS.map((slot) => {
    const slotClass = cn(
      'relative',
      slot === 0 ? FIRST : REST,
      GHOST_LOOK[look],
    );
    return (
      <span className={slotClass} key={slot}>
        {look === 'loading' ? <TileTextGhost first={slot === 0} /> : null}
      </span>
    );
  });
}

/** The lens grid's exact space while its tiles load */
export default function LensGridSkeleton() {
  return (
    <div aria-busy className={LENS_GRID}>
      <LensGridSlots look="loading" />
    </div>
  );
}

/**
 * A lens whose tiles are unavailable (the per-section error, static):
 * dashed slots in the grid's place and the failed card over them. Goes
 * inside the lens's own grid (`LensPanel`).
 */
export function LensGridFailed({ title }: Readonly<{ title: string }>) {
  return (
    <>
      <LensGridSlots look="failed" />
      <div className={NO_INSET}>
        <RowErrorCard state="unavailable" title={title} />
      </div>
    </>
  );
}
