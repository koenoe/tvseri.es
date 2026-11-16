import { PAGE_MAIN_CLASS } from '@/components/background/Page';
import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { KnownForSkeleton } from './KnownFor';
import {
  PERSON_COLUMN,
  PERSON_MAIN,
  PERSON_SIDE_HEADER,
  PERSON_SIDEBAR,
} from './layout';
import {
  AwardsSkeleton,
  CareerSkeleton,
  CollaboratorsSkeleton,
} from './Skeletons';
import { ShowsSkeleton } from './shows/Shows';
import { FamilyFactsSkeleton } from './sidebar/FamilyFacts';
import { WatchedPlaceholder } from './watched/WatchedHole';

/** A bar inside one of the sidebar's pulsing blocks */
const BAR = cn('block rounded-4', GHOST_FILL);
const HEADER_GHOST = cn(PERSON_SIDE_HEADER, 'max-lg:min-h-[192px]', PULSE);
const PORTRAIT_GHOST = cn(
  'block h-[150px] w-[112px] rounded-12 lg:h-[400px] lg:w-[300px] lg:rounded-16',
  GHOST_FILL,
);
const IMDB_GHOST = cn('block h-8 w-[72px] rounded-full', GHOST_FILL);
const PILL_ROW = cn('lg:-mt-2.5', PULSE);
const BIOGRAPHY_GHOST = cn('flex flex-col gap-2', PULSE);

/**
 * While the person resolves (a first visit, a client navigation): the whole
 * page in the person page's own grid. The sidebar (portrait, name and
 * facts, the IMDb pill, three biography lines, the family lines) and the
 * five sections at the median person's sizes, so the page keeps its height
 * and nothing below moves when the person arrives.
 */
export default function PersonSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading" className={PAGE_MAIN_CLASS}>
      <div className="relative z-10">
        <div className={PERSON_MAIN} data-placeholder="person">
          <aside aria-hidden="true" className={PERSON_SIDEBAR}>
            <div className={HEADER_GHOST}>
              <span className={PORTRAIT_GHOST} />
              <span className="flex flex-col gap-3 self-stretch lg:gap-4.5">
                <span className={`${BAR} h-10 w-4/5 lg:h-14`} />
                <span className={`${BAR} h-4 w-3/5`} />
                <span className={`${BAR} h-4 w-1/2`} />
              </span>
            </div>
            <div className={PILL_ROW}>
              <span className={IMDB_GHOST} />
            </div>
            <div className={BIOGRAPHY_GHOST}>
              {[0, 1, 2].map((line) => (
                <span className="flex h-7 items-center" key={line}>
                  <span
                    className={`${BAR} h-3 ${line === 2 ? 'w-3/5' : 'w-full'}`}
                  />
                </span>
              ))}
              <span className="flex h-5 items-center">
                <span className={`${BAR} h-3 w-12`} />
              </span>
            </div>
            <FamilyFactsSkeleton />
            <WatchedPlaceholder />
          </aside>
          <div className={PERSON_COLUMN} data-placeholder="person-column">
            <KnownForSkeleton />
            <CareerSkeleton />
            <ShowsSkeleton />
            <CollaboratorsSkeleton />
            <AwardsSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}
