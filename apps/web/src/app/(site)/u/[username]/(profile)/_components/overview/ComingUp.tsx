import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { loadOverview, loadWaitingFor } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import Lane from '../blocks/Lane';
import LaneGhost, { ShowAllGhost } from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import ComingUpList from './coming-up/ComingUpList';
import { NO_DATE_ROW } from './coming-up/noDateRow';
import Ticket, {
  TICKET_BODY,
  TICKET_GRID,
  TICKET_STUB,
  TICKET_TEXT,
  ticketDateLine,
  WATCHLIST_LABEL,
  WATCHLIST_TAG,
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

/** The watchlist tag as a ghost: its box, its words hidden */
const WATCHLIST_TAG_GHOST = cn(WATCHLIST_TAG, GHOST_FILL, 'text-transparent');
const DATE_LINE = ticketDateLine(false);
const DATE_LINE_TAGGED = ticketDateLine(true);

/**
 * A ticket's ghost. `onWatchlist`: its date line carries the tag's ghost,
 * which wraps where the real tag does (its own line on a phone)
 */
function TicketGhost({ onWatchlist }: Readonly<{ onWatchlist: boolean }>) {
  const dateLine = onWatchlist ? DATE_LINE_TAGGED : DATE_LINE;
  return (
    <div className={TICKET_GRID}>
      <span className={TICKET_STUB}>
        <TextLine className="text-title-3" width="w-5" />
        <TextLine className="text-overline" width="w-8" />
      </span>
      <span className={TICKET_BODY}>
        <Ghost className="h-[54px] w-9 shrink-0 rounded-[5px]" />
        <span className={TICKET_TEXT}>
          <TextLine className="text-body-sm" width="w-32" />
          <MetaRow fit="drop">
            <TextLine className="text-caption" width="w-36" />
          </MetaRow>
          <MetaRow className={dateLine}>
            {/* a date with its icon ("Thu Nov 19"): with the tag it fits a 416px lane's line */}
            <TextLine className="text-meta" width="w-21" />
            {onWatchlist ? (
              <span className={WATCHLIST_TAG_GHOST}>
                <span className="size-3 shrink-0" />
                {WATCHLIST_LABEL}
              </span>
            ) : null}
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

/**
 * A busy month's tickets: every other one a premiere on your watchlist (on a
 * phone its tag takes a line of its own)
 */
const TICKET_GHOSTS = Array.from({ length: LANE_CAPS.comingUp }, (_, index) => {
  const onWatchlist = index % 2 === 0;
  return <TicketGhost key={index} onWatchlist={onWatchlist} />;
});

/** Coming up's placeholder: a busy month (four tickets, Show all), then No date yet */
export function ComingUpSkeleton() {
  return (
    <LaneGhost count={false} title="Coming up">
      <div className="flex flex-col gap-3">{TICKET_GHOSTS}</div>
      <ShowAllGhost />
      <NoDateYetGhost />
    </LaneGhost>
  );
}
