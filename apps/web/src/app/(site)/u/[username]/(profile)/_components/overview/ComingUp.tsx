import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import MetaRow from '@/components/ui/meta/MetaRow';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import profilePath from '@/lib/routing/profilePath';

import { loadOverview, loadWaitingFor } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import EmptyState from '../blocks/EmptyState';
import HeadLink from '../blocks/HeadLink';
import Lane from '../blocks/Lane';
import LaneGhost, { LinkGhost } from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import Ticket, {
  TICKET_BODY,
  TICKET_GRID,
  TICKET_STUB,
  TICKET_TEXT,
  ticketDateLine,
  WATCHLIST_LABEL,
  WATCHLIST_TAG,
} from './coming-up/Ticket';
import { monthsBetween, nothingAhead, ticketText } from './coming-up/tickets';

/**
 * Coming up: the four nearest tickets of the next 30 days (premieres pink,
 * finales cyan, how it airs and where), and "Calendar ›" to the rest: later
 * dates and the renewed shows with no date live on the calendar. Nothing
 * ahead at all: one calm line and no link (the calendar would be empty too).
 * Owner only.
 */
export default async function ComingUp({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [overview, waiting] = await Promise.all([
    loadOverview(profile),
    loadWaitingFor(profile),
  ]);
  const now = Date.now();
  const tickets = overview.comingUp.slice(0, LANE_CAPS.comingUp).map((item) => {
    const back = item.finishedAt
      ? monthsBetween(item.finishedAt, item.date)
      : null;
    const text = ticketText(item, { backAfterMonths: back });
    const episodeId = `${item.seriesId}-${item.season}-${item.episode}`;
    return <Ticket item={item} key={episodeId} now={now} text={text} />;
  });
  const nothing = nothingAhead(overview, waiting);
  const href = profilePath(profile.user.username, 'calendar');
  const link = nothing ? undefined : <HeadLink href={href}>Calendar</HeadLink>;
  return (
    <Lane
      dot="pink"
      hollow={tickets.length === 0}
      id="v3-cu"
      link={link}
      title="Coming up"
    >
      {tickets.length > 0 ? (
        <div className="flex flex-col gap-3">{tickets}</div>
      ) : (
        <EmptyState
          glyph={calendarGlyph}
          sub={
            nothing
              ? 'When a show you follow gets a date, it counts down here.'
              : 'Later dates and renewed shows are on your calendar.'
          }
          title={
            nothing ? 'Nothing coming up yet' : 'Nothing in the next 30 days'
          }
        />
      )}
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

/**
 * Four tickets: every other one on your watchlist (on a phone its tag takes a
 * line of its own)
 */
const TICKET_GHOSTS = Array.from({ length: LANE_CAPS.comingUp }, (_, index) => {
  const onWatchlist = index % 2 === 0;
  return <TicketGhost key={index} onWatchlist={onWatchlist} />;
});

/** Coming up's placeholder: four tickets and the Calendar link */
export function ComingUpSkeleton() {
  const link = <LinkGhost width="w-20" />;
  return (
    <LaneGhost count={false} link={link} title="Coming up">
      <div className="flex flex-col gap-3">{TICKET_GHOSTS}</div>
    </LaneGhost>
  );
}
