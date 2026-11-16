import { GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import {
  GET_STARTED_GRID,
  GET_STARTED_SECTION,
  GetStartedHead,
  STEP_COPY,
  STEP_ORDER,
} from './GetStarted';
import { STEP_CARD, STEP_CIRCLE, StepText } from './GetStartedStep';

const COUNT = cn('h-5.5 w-12 rounded-full', GHOST_LOOK.loading);
const CIRCLE = cn(STEP_CIRCLE, GHOST_LOOK.loading);

/**
 * Get started's placeholder (a new viewer, `data-home="new"`): the section
 * itself, as its steps' copy is static; only what comes with the data is a
 * ghost: the "0 of 3" count and each step's circle (a number, or the check
 * of a step done). The cards take their real height from their real text.
 */
export default function GetStartedGhost() {
  return (
    <section
      aria-hidden
      className={GET_STARTED_SECTION}
      data-placeholder="get-started"
    >
      <GetStartedHead count={<span className={COUNT} />} />
      <div className={GET_STARTED_GRID}>
        {STEP_ORDER.map((key) => (
          <div className={STEP_CARD} key={key}>
            <span className={CIRCLE} />
            <StepText body={STEP_COPY[key].body} title={STEP_COPY[key].title} />
          </div>
        ))}
      </div>
    </section>
  );
}
