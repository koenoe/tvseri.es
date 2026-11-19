import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { loadOverview, loadWaitingFor } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import Lane from '../blocks/Lane';
import LaneGhost, { GhostRows, ShowAllGhost } from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import ComingUpList from './coming-up/ComingUpList';
import { NO_DATE_ROW } from './coming-up/noDateRow';
import Ticket, {
  TICKET_BODY,
  TICKET_GRID,
  TICKET_STUB,
  TICKET_TEXT,
} from './coming-up/Ticket';
import { monthsBetween, ticketText } from './coming-up/tickets';
import WaitRow from './coming-up/WaitRow';

/**
 * Coming up: when your shows continue, near to far. Tickets count down
 * the next 30 days (premieres pink, finales cyan, how it airs and where);
 * the finished shows that return later follow under Later; the renewed
 * ones with no date wait behind No date yet. Owner only.
 */
export default async function ComingUp({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [overview, waiting] = await Promise.all([
    loadOverview(profile),
    loadWaitingFor(profile),
  ]);
  const now = Date.now();
  const tickets = overview.comingUp.map((item) => {
    const back = item.finishedAt
      ? monthsBetween(item.finishedAt, item.date)
      : null;
    const text = ticketText(item, back);
    const episodeId = `${item.seriesId}-${item.season}-${item.episode}`;
    return <Ticket item={item} key={episodeId} now={now} text={text} />;
  });
  const later = waiting.items
    .filter((item) => item.state === 'dated')
    .map((item) => <WaitRow item={item} key={item.seriesId} now={now} />);
  const noDate = waiting.items
    .filter((item) => item.state === 'renewed')
    .map((item) => <WaitRow item={item} key={item.seriesId} now={now} />);
  const empty = tickets.length + later.length + noDate.length === 0;
  return (
    <Lane dot="pink" hollow={empty} id="v3-cu" title="Coming up">
      <ComingUpList later={later} noDate={noDate} tickets={tickets} />
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

const NO_DATE_GHOST = cn(NO_DATE_ROW, GHOST_FILL);

/** The No date yet row: its icon, its label and its count */
function NoDateYetGhost() {
  return (
    <span className={NO_DATE_GHOST}>
      <Ghost className="size-3.5 shrink-0 rounded-4" />
      <TextLine className="text-body-sm" width="w-20" />
      <Ghost className="h-5.5 w-5.5 shrink-0 rounded-full" />
    </span>
  );
}

/** Coming up's placeholder: a busy month (four tickets, Show all), then No date yet */
export function ComingUpSkeleton() {
  return (
    <LaneGhost count={false} title="Coming up">
      <GhostRows className="flex flex-col gap-3" count={LANE_CAPS.comingUp}>
        <TicketGhost />
      </GhostRows>
      <ShowAllGhost />
      <NoDateYetGhost />
    </LaneGhost>
  );
}
