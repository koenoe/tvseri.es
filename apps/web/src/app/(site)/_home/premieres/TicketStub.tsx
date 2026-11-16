import cn from '@/lib/cn';

import { ticketStub } from './format';

type Props = Readonly<{
  daysAway: number;
  /** pink for a premiere, cyan for a season finale */
  tone: 'cyan' | 'pink';
}>;

/** The stub's column: the count over its unit, the dashed tear at its edge */
export const TICKET_STUB =
  'flex flex-col items-center justify-center gap-1 border-r-2 border-dashed border-white/14';

/**
 * The ticket's stub (HMFinal `e3-tks`): the countdown in the moment's
 * colour on a faint wash of it, cut off from the body by a dashed tear.
 * Tonight is a pink dot over the word.
 */
export default function TicketStub({ daysAway, tone }: Props) {
  const { count, unit } = ticketStub(daysAway);
  const classes = cn(TICKET_STUB, tone === 'cyan' ? 'bg-cyan/5' : 'bg-pink/7');
  const countClass = cn(
    'text-title-2 tabular-nums',
    tone === 'cyan' ? 'text-cyan' : 'text-pink',
  );
  return (
    <span aria-hidden="true" className={classes}>
      {count === null ? (
        <i className="block size-2 rounded-full bg-pink" />
      ) : (
        <b className={countClass}>{count}</b>
      )}
      <small className="text-overline text-white/60 uppercase">{unit}</small>
    </span>
  );
}
