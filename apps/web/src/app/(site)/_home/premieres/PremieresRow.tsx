import type { Premiere } from '@tvseri.es/schemas';
import { PULSE } from '@/components/ui/ghost/ghosts';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import RowArrows from '@/components/ui/row/RowArrows';
import RowFrame from '@/components/ui/row/RowFrame';
import RowHeader from '@/components/ui/row/RowHeader';
import RowScrollRestore from '@/components/ui/row/RowScrollRestore';
import cn from '@/lib/cn';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import PremiereTicket, { TICKET_WIDTH } from './PremiereTicket';
import TicketGhost from './TicketGhost';

const ID = 'premieres';
export const PREMIERES_TITLE = 'Premieres';
const SUBTITLE = 'New series and new seasons, next 60 days';

/** The tickets' rail: fixed-width cards (328, 460 on desktop) 12px apart (16), one row */
const RAIL =
  'relative flex snap-x snap-mandatory scroll-pr-(--row-end) scroll-pl-(--row-start) gap-3 overflow-x-auto overscroll-x-contain scrollbar-none pt-6 pr-(--row-end) pb-6 pl-(--row-start) md:gap-4';

/** The placeholder's rail: the row's, one pulsing layer */
const LIST = cn(RAIL, 'items-stretch');
const ITEM = cn('flex snap-start', TICKET_WIDTH);
const GHOST_RAIL = cn(RAIL, 'overflow-hidden', PULSE);
const GHOST_TICKETS = [0, 1, 2, 3];

/**
 * New shows and new seasons as tickets. Built from the
 * shared row parts (header, arrows, Back restore) as `Row` does, because the
 * tickets have a fixed width (460, 328 on phones) and a 16px gap (12 on
 * phones) that none of `Row`'s tile geometries give. A server component;
 * only the arrows and each ticket's Watchlist pill are islands.
 */
export default function PremieresRow({
  premieres,
  states,
}: Readonly<{
  premieres: ReadonlyArray<Premiere>;
  /** the viewer's states (the page's one read) for the tickets' Watchlist */
  states?: ControlStatesRead;
}>) {
  const titleId = `${ID}-title`;
  const railId = `${ID}-rail`;
  return (
    <RowFrame
      inset="page"
      look="home"
      name={ID}
      tiles="backdrop"
      titleId={titleId}
    >
      <RowHeader
        subtitle={SUBTITLE}
        subtitleGlyph={calendarGlyph}
        title={PREMIERES_TITLE}
        titleId={titleId}
      >
        <RowArrows railId={railId} title={PREMIERES_TITLE} />
      </RowHeader>
      <ul className={LIST} id={railId} role="list">
        {premieres.map((premiere) => (
          <li
            className={ITEM}
            key={`${premiere.series.id}-${premiere.kind}-${premiere.date}`}
          >
            <PremiereTicket premiere={premiere} states={states} />
          </li>
        ))}
      </ul>
      <RowScrollRestore railId={railId} restoreKey={ID} />
    </RowFrame>
  );
}

/**
 * The row while it loads: the same frame and header, and four tickets built
 * from the ticket's own layout (`PremiereTicket`, `TicketStub`): the stub's
 * count and unit, the dashed tear, the backdrop with the logo's place, and
 * the kind and date lines with the Watchlist pill (under them on a phone).
 */
export function PremieresSkeleton() {
  return (
    <RowFrame
      aria-busy
      inset="page"
      look="home"
      name={ID}
      tiles="backdrop"
      titleId={`${ID}-title`}
    >
      <RowHeader
        subtitle={SUBTITLE}
        subtitleGlyph={calendarGlyph}
        title={PREMIERES_TITLE}
        titleId={`${ID}-title`}
      />
      <div aria-hidden className={GHOST_RAIL}>
        {GHOST_TICKETS.map((index) => (
          <TicketGhost key={index} />
        ))}
      </div>
    </RowFrame>
  );
}
