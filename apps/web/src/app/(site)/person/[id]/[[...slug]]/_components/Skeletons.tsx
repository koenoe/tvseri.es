import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';

import {
  COLLABORATOR_GRID,
  COLLABORATOR_ROLE_LINE,
  COLLABORATOR_TILE,
  PERSON_LANE,
  PERSON_SECTION,
} from './layout';

/**
 * Fallbacks at the sections' real sizes (desktop at 1440, phone at 390),
 * with the sections' own headers (their titles are fixed text), so a
 * section streaming in on a first visit or a client navigation doesn't push
 * the page down. The sizes are the median person's, measured on real people
 * (a prolific actor, crew, deceased, sparse): Career ten rows, Shows six
 * rows and "Show all", Collaborators and Awards one lane. A sparse person's
 * Career and Shows are shorter, a prolific one's at most one row taller
 * (Career is capped at eleven rows).
 */

/** Where each placeholder row's bar starts and how wide it runs (% of the track), like a career's */
const CAREER_BARS = [
  { start: 2, width: 58 },
  { start: 14, width: 66 },
  { start: 30, width: 40 },
  { start: 8, width: 44 },
  { start: 36, width: 52 },
  { start: 22, width: 30 },
  { start: 48, width: 36 },
  { start: 12, width: 24 },
  { start: 58, width: 28 },
  { start: 40, width: 20 },
] as const;

const LANE = cn(PERSON_LANE, 'animate-ghost');
const CAREER_NAME = cn('h-3 w-3/4 rounded-6 lg:h-2.5', GHOST_FILL);
const CAREER_BAR = cn('h-2 rounded-full lg:h-1.5', GHOST_FILL);

/** The snap row's gap and the grid's, unscrollable: one pulsing layer */
const COLLABORATORS_ROW = cn(
  'flex h-[170px] animate-ghost gap-3 overflow-hidden lg:grid lg:h-auto',
  COLLABORATOR_GRID,
);

const CAREER_LANE = cn(
  LANE,
  'h-[563px] overflow-hidden px-4 pt-4 lg:h-[422px] lg:px-6 lg:pt-5',
);

export function CareerSkeleton() {
  return (
    <section
      aria-hidden="true"
      className={PERSON_SECTION}
      data-placeholder="person-career"
    >
      <SectionHead id="person-career-loading" title="Career" />
      <div className="h-[46px] lg:hidden" />
      <div className={CAREER_LANE}>
        <div className="h-6" />
        {CAREER_BARS.map((bar) => (
          <div
            className="grid h-[52px] grid-cols-[104px_minmax(0,1fr)] items-center gap-3 lg:h-[30px] lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-4"
            key={bar.start}
          >
            <span className={CAREER_NAME} />
            <span
              className={CAREER_BAR}
              style={{ marginLeft: `${bar.start}%`, width: `${bar.width}%` }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function CollaboratorsSkeleton() {
  return (
    <section
      aria-hidden="true"
      className={PERSON_SECTION}
      data-placeholder="person-collaborators"
    >
      <SectionHead
        id="person-collaborators-loading"
        title="Frequent collaborators"
      />
      {/* below lg a snap row (170px); from lg six faces whose height follows their column (aspect 4/5), with the row's and the tile's gaps, as `Collaborators` draws them */}
      <div className={COLLABORATORS_ROW}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            className={COLLABORATOR_TILE}
            data-placeholder="person-collaborator"
            key={index}
          >
            <Ghost className="aspect-4/5 rounded-10" />
            <TextLine className="text-body-sm" width="w-3/4" />
            <TextLine className={COLLABORATOR_ROLE_LINE} width="w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}

const AWARDS_LANE = cn(
  LANE,
  'grid h-[220px] grid-cols-2 gap-x-6 gap-y-4 p-5 lg:h-[136px] lg:grid-cols-4',
);

export function AwardsSkeleton() {
  return (
    <section
      aria-hidden="true"
      className={PERSON_SECTION}
      data-placeholder="person-awards"
    >
      <SectionHead id="person-awards-loading" title="Awards" />
      <div className={AWARDS_LANE}>
        {[0, 1, 2, 3].map((award) => (
          <span className="flex flex-col" key={award}>
            <TextLine bar="h-6" className="text-title-1" width="w-8" />
            <TextLine className="text-body-sm" width="w-28" />
            <TextLine className="text-caption" width="w-32" />
          </span>
        ))}
      </div>
    </section>
  );
}
