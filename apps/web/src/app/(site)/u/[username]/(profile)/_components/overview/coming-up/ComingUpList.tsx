'use client';

import type { ReactNode } from 'react';

import { ShowAll, useCap } from '../../blocks/CappedRows';
import { LANE_CAPS } from '../../blocks/laneCaps';
import NoDateYet from './NoDateYet';

/** Between the tickets and the Later rows: a separator, not a row */
function LaterDivider() {
  return (
    <div
      aria-label="Later"
      className="flex h-5 items-center gap-2.5 px-0.5"
      role="separator"
    >
      <span
        aria-hidden="true"
        className="shrink-0 text-overline uppercase text-white/60"
      >
        Later
      </span>
      <i className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/**
 * Coming up's body, near to far: the tickets of the next 30 days, then a
 * quiet Later divider and the dated returns further out, in one list under
 * one cap (`LANE_CAPS.comingUp`) with one "Show all N"; then No date yet,
 * the one folded row, always last. The four rows go to the nearest dates,
 * so Later shows exactly when the tickets leave room. The rows are
 * rendered on the server and passed in.
 */
export default function ComingUpList({
  finished,
  later,
  noDate,
  tickets,
}: Readonly<{
  /** "All finished ›" beside the opened No date yet (null on day zero) */
  finished: ReactNode;
  /** Dated returns more than 30 days out, soonest first */
  later: ReadonlyArray<ReactNode>;
  /** Renewed, no date announced */
  noDate: ReadonlyArray<ReactNode>;
  tickets: ReadonlyArray<ReactNode>;
}>) {
  const dated = tickets.length + later.length;
  const { capped, id, limit, open, toggle } = useCap(dated, LANE_CAPS.comingUp);
  const shownTickets = tickets.slice(0, limit);
  const shownLater = later.slice(0, Math.max(0, limit - tickets.length));
  const divider =
    shownTickets.length > 0 && shownLater.length > 0 ? <LaterDivider /> : null;
  const laterRows =
    shownLater.length > 0 ? (
      <div className="flex flex-col gap-2.5" data-equal-rows="">
        {shownLater}
      </div>
    ) : null;
  const lastRow =
    noDate.length > 0 || dated === 0 ? (
      <NoDateYet alone={dated === 0} link={finished} rows={noDate} />
    ) : null;
  if (dated === 0) {
    return lastRow;
  }
  return (
    <>
      <h3 className="sr-only">Next 30 days, then later</h3>
      <div className="flex flex-col gap-3" id={id}>
        {shownTickets}
        {divider}
        {laterRows}
      </div>
      {capped ? (
        <ShowAll controls={id} open={open} toggle={toggle} total={dated} />
      ) : null}
      {lastRow}
    </>
  );
}
