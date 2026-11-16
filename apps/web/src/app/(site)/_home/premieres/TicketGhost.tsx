import WatchlistToggleGhost from '@/components/marking/WatchlistToggleGhost';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import {
  TICKET_ART,
  TICKET_BODY,
  TICKET_FRAME,
  TICKET_LINES,
  TICKET_LOGO,
  TICKET_LOGO_BOX,
  TICKET_WIDTH,
} from './PremiereTicket';
import { TICKET_STUB } from './TicketStub';

const TICKET = cn(TICKET_FRAME, TICKET_WIDTH, GHOST_FILL);
const LOGO = cn(TICKET_LOGO_BOX, 'rounded-6');
const ART = cn(TICKET_ART, GHOST_FILL);

/** One Premieres ticket while the row loads, in the ticket's own layout */
export default function TicketGhost() {
  return (
    <span className={TICKET}>
      <span className={TICKET_STUB}>
        <TextLine className="text-title-2" width="w-6" />
        <TextLine className="text-overline" width="w-8" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={ART}>
          <span className={TICKET_LOGO}>
            <Ghost className={LOGO} />
          </span>
        </span>
        <span className={TICKET_BODY}>
          <span className={TICKET_LINES}>
            <TextLine className="text-caption" width="w-24" />
            <TextLine className="text-meta" width="w-40" />
          </span>
          <WatchlistToggleGhost />
        </span>
      </span>
    </span>
  );
}
