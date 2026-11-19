import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';

import { monthsSoFar } from '../_lib/monthsSoFar';
import {
  JUMP_MONTH,
  JUMP_MONTHS,
  JUMP_WEEK,
  JUMP_YEAR,
  JUMP_YEARS,
} from './jumpStyles';

/** Years drawn: the fold's newest five (its "Show all" foot needs the data) */
const YEARS = 5;

const COUNT = 'ml-auto text-meta';

/** The This week pill, flat: its box, no tint or ring */
const WEEK = `${JUMP_WEEK} ${GHOST_FILL}`;

function YearGhost() {
  return (
    <span className={JUMP_YEAR}>
      <Ghost className="size-4 rounded-4" />
      <TextLine className="text-body-sm" width="w-9" />
      <TextLine className={COUNT} width="w-8" />
    </span>
  );
}

function MonthGhost() {
  return (
    <span className={JUMP_MONTH}>
      <TextLine className="text-meta" width="w-7" />
      <TextLine className={COUNT} width="w-5" />
    </span>
  );
}

/**
 * Jump to before the years land, row for row: the owner's This week, the
 * opening year open at `months` months, then the next four years.
 */
export function JumpToGhosts({ months }: Readonly<{ months: number }>) {
  const week = <span className={WEEK} data-ghost="week" />;
  return (
    <div
      aria-hidden="true"
      className="animate-ghost"
      data-placeholder="history-jump"
    >
      <OwnerVisitor owner={week} visitor={null} />
      <div className={JUMP_YEARS}>
        <div>
          <YearGhost />
          <div className={JUMP_MONTHS}>
            {Array.from({ length: months }, (_, index) => (
              <MonthGhost key={index} />
            ))}
          </div>
        </div>
        {Array.from({ length: YEARS - 1 }, (_, index) => (
          <YearGhost key={index} />
        ))}
      </div>
    </div>
  );
}

/** This year's months so far stand for the opening year's */
export default async function JumpToSkeleton() {
  const months = await monthsSoFar();
  return <JumpToGhosts months={months} />;
}
