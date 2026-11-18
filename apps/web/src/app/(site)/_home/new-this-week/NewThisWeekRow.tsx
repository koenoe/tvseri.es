import type { NewRelease } from '@tvseri.es/schemas';

import { Ghost, Line, PULSE } from '@/components/ui/ghost/ghosts';
import { ROW_RAIL } from '@/components/ui/row/Row';
import RowArrows from '@/components/ui/row/RowArrows';
import RowFrame from '@/components/ui/row/RowFrame';
import RowHeader from '@/components/ui/row/RowHeader';
import RowScrollRestore from '@/components/ui/row/RowScrollRestore';
import PosterTile from '@/components/ui/tile/PosterTile';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import cn from '@/lib/cn';

import LeadTile from './LeadTile';
import { ID, LEAD_COLUMN, LEAD_HEIGHT, LEAD_WIDTH, TITLE } from './layout';

const TITLE_ID = `${ID}-title`;
const RAIL_ID = `${ID}-rail`;

/** A tile's place in the rail, as `Row` gives it */
const SLOT = 'shrink-0 snap-start';
const POSTER_SLOT = cn(SLOT, 'w-(--row-tile)');
const LEAD_SLOT = cn(SLOT, LEAD_WIDTH);

/**
 * Home's "New this week": what premiered in the last week, most popular
 * first. A poster row (Top Picks' geometry, header and arrows) whose first
 * tile, the lead, is wide: its backdrop at the posters' height with its
 * meta line under it, so the row still reads as one line. The posters have
 * no line under them, as in the other poster rows. Built from `Row`'s parts,
 * because `Row` gives every tile one width. Without a backdrop on the first
 * show there is no lead and every tile is a poster.
 */
export default function NewThisWeekRow({
  items,
}: Readonly<{ items: ReadonlyArray<NewRelease> }>) {
  const [first, ...others] = items;
  const lead = first?.series.backdropImage ? first : undefined;
  const posters = lead ? others : items;
  return (
    <RowFrame
      inset="page"
      look="home"
      name={ID}
      tiles="poster"
      titleId={TITLE_ID}
    >
      <RowHeader title={TITLE} titleId={TITLE_ID}>
        <RowArrows railId={RAIL_ID} title={TITLE} />
      </RowHeader>
      <ul className={ROW_RAIL} id={RAIL_ID} role="list">
        {lead ? (
          <li className={LEAD_SLOT} key={lead.series.id}>
            <LeadTile release={lead} />
          </li>
        ) : null}
        {posters.map(({ series }) => (
          <li className={POSTER_SLOT} key={series.id}>
            <PosterTile
              id={series.id}
              overlay={<WatchedOverlay id={series.id} />}
              poster={series.posterImage}
              slug={series.slug}
              title={series.title}
            />
          </li>
        ))}
      </ul>
      <RowScrollRestore railId={RAIL_ID} restoreKey={ID} />
    </RowFrame>
  );
}

/** Enough posters after the lead to fill the widest row */
const GHOST_POSTERS = [0, 1, 2, 3, 4, 5];
const GHOST_LEAD = cn('shrink-0', LEAD_WIDTH, LEAD_COLUMN);
const GHOST_LEAD_PICTURE = cn('w-full rounded-12', LEAD_HEIGHT);

/** The rail's ghosts: the rail's own padding and gaps, one pulsing layer */
const GHOST_RAIL = cn(
  'flex items-start gap-(--row-gap) overflow-hidden pt-[var(--row-rail-pt,24px)] pr-(--row-end) pb-6 pl-(--row-start)',
  PULSE,
);

/**
 * The row while it loads: the real header, then the lead's backdrop and its
 * meta line and the posters, as ghosts in the row's own geometry
 */
export function NewThisWeekSkeleton() {
  return (
    <RowFrame
      aria-busy
      inset="page"
      look="home"
      name={ID}
      tiles="poster"
      titleId={TITLE_ID}
    >
      <RowHeader title={TITLE} titleId={TITLE_ID} />
      <div aria-hidden className={GHOST_RAIL}>
        <span className={GHOST_LEAD}>
          <Ghost className={GHOST_LEAD_PICTURE} />
          <Line className="h-5" width="w-2/3" />
        </span>
        {GHOST_POSTERS.map((index) => (
          <span className="w-(--row-tile) shrink-0" key={index}>
            <Ghost className="aspect-2/3 w-full rounded-(--tile-radius)" />
          </span>
        ))}
      </div>
    </RowFrame>
  );
}
