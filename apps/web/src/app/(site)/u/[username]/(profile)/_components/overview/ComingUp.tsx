import { seasonCode } from '@tvseri.es/schemas';

import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import MetaRow from '@/components/ui/meta/MetaRow';
import { formatAirWeekdayDate } from '@/lib/format/airDate';

import { loadOverview, loadWaitingFor } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import CappedRows from '../blocks/CappedRows';
import EmptyState from '../blocks/EmptyState';
import Lane from '../blocks/Lane';
import LaneGhost, { GhostRows, ShowAllGhost } from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import Ticket, {
  TICKET_BODY,
  TICKET_GRID,
  TICKET_STUB,
  TICKET_TEXT,
} from './coming-up/Ticket';
import { monthsBetween, ticketText } from './coming-up/tickets';

/**
 * Coming up: tickets counting down the next 30 days, premieres
 * pink, finales cyan, how it airs and where. Owner only.
 */
export default async function ComingUp({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [overview, waiting] = await Promise.all([
    loadOverview(profile),
    loadWaitingFor(profile),
  ]);
  const now = Date.now();
  const tickets = overview.comingUp;

  if (tickets.length === 0) {
    const nextReturn = waiting.items.find((item) => item.nextDate);
    const dayZero = isDayZero(overview);
    return (
      <Lane dot="pink" hollow id="v3-cu" title="Coming up">
        <EmptyState
          glyph={calendarGlyph}
          sub={
            dayZero
              ? 'Premieres and new episodes, 30 days ahead.'
              : nextReturn?.nextDate
                ? `Next: ${nextReturn.title} ${seasonCode(nextReturn.nextSeason)}, ${formatAirWeekdayDate(nextReturn.nextDate, now)}.`
                : 'Nothing you follow airs in the next 30 days.'
          }
          title={
            dayZero
              ? 'No dates yet'
              : nextReturn
                ? 'Nothing in the next 30 days'
                : 'No dates announced'
          }
        />
      </Lane>
    );
  }

  const finishedAt = new Map(
    waiting.items.map((item) => [item.seriesId, item.finishedAt] as const),
  );
  return (
    <Lane dot="pink" id="v3-cu" title="Coming up">
      <CappedRows
        cap={LANE_CAPS.comingUp}
        className="flex flex-col gap-3"
        rows={tickets.map((item) => {
          const finished = finishedAt.get(item.seriesId);
          const text = ticketText(
            item,
            finished ? monthsBetween(finished, item.date) : null,
          );
          return (
            <Ticket
              item={item}
              key={`${item.seriesId}-${item.season}-${item.episode}`}
              now={now}
              text={text}
            />
          );
        })}
      />
    </Lane>
  );
}

function TicketGhost() {
  return (
    <div className={TICKET_GRID}>
      <span className={TICKET_STUB}>
        <TextLine className="text-title-3" width="w-5" />
        <TextLine className="text-overline" width="w-8" />
      </span>
      <span className={TICKET_BODY}>
        <Ghost className="h-[51px] w-[34px] shrink-0 rounded-[5px]" />
        <span className={TICKET_TEXT}>
          <TextLine className="text-body-sm" width="w-32" />
          <MetaRow fit="drop">
            <TextLine className="text-caption" width="w-36" />
          </MetaRow>
          <MetaRow className="mt-0.5 h-[22px]" fit="drop">
            <TextLine className="text-meta" width="w-24" />
          </MetaRow>
        </span>
      </span>
    </div>
  );
}

/** Coming up's placeholder: the capped lane (four tickets and Show all) */
export function ComingUpSkeleton() {
  return (
    <LaneGhost count={false} title="Coming up">
      <GhostRows className="flex flex-col gap-3" count={LANE_CAPS.comingUp}>
        <TicketGhost />
      </GhostRows>
      <ShowAllGhost />
    </LaneGhost>
  );
}
