import type { Person } from '@tvseri.es/schemas';

import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { SectionError } from '@/components/ui/row/RowError';
import SectionHead from '@/components/ui/section/SectionHead';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';

import { loadShowsView } from '../../_data/loaders';
import { PERSON_SECTION } from '../layout';
import { LIST } from './listStyles';
import ShowRow from './ShowRow';
import ShowsList from './ShowsList';

/** The filter's four options and the list's first six rows (Show all after) */
const FILTER_GHOSTS = [0, 1, 2, 3];
const ROW_GHOSTS = [0, 1, 2, 3, 4, 5];

const SKELETON = cn(PERSON_SECTION, 'animate-ghost');
const SECTION = cn(PERSON_SECTION, 'scroll-mt-20');

/** The section's height while it streams (header, pills, six rows, Show all) */
export function ShowsSkeleton() {
  return (
    <section
      aria-hidden="true"
      className={SKELETON}
      data-placeholder="person-shows"
    >
      <SectionHead id="person-shows-loading" title="Series" />
      <div className="flex h-[34px] items-center gap-1 lg:h-11">
        {FILTER_GHOSTS.map((n) => (
          <Ghost className="h-7 w-20 rounded-8 lg:h-9" key={n} />
        ))}
      </div>
      <div className="flex h-[366px] flex-col overflow-hidden lg:grid lg:h-[171px] lg:grid-cols-2 lg:gap-x-6">
        {ROW_GHOSTS.map((n) => (
          <span
            className="flex h-[61px] shrink-0 flex-col justify-center gap-1.5 border-t border-white/6 lg:h-[57px] lg:px-2.5"
            key={n}
          >
            <span className="flex items-center justify-between gap-3">
              <TextLine className="text-body-sm" width="w-40" />
              <TextLine className="text-caption" width="w-10" />
            </span>
            <TextLine className="text-meta" width="w-48" />
          </span>
        ))}
      </div>
      <Ghost className="h-12 rounded-12" />
    </section>
  );
}

/**
 * Shows: every show of his, cast and crew merged,
 * with the count, filters and the viewer's marks. The rows are server HTML;
 * the island only sets the filter, and the folded self credits load when
 * opened. Absent without credits.
 */
export default async function Shows({
  person,
}: Readonly<{ person: Pick<Person, 'gender' | 'id'> }>) {
  const view = await loadShowsView(person.id, person.gender);
  if (isUnavailable(view)) {
    return (
      <SectionError
        inset="flush"
        placeholder={<ShowsSkeleton />}
        state="unavailable"
        title="Series"
      />
    );
  }
  if (!view || view.total + view.self.length === 0) {
    return null;
  }
  const self = { count: view.self.length, label: view.selfLabel };

  return (
    <section
      aria-labelledby="person-shows-title"
      className={SECTION}
      data-slot="person-shows"
      id="person-shows"
    >
      <ShowsList
        counts={view.counts}
        gender={person.gender}
        personId={person.id}
        self={self}
        titleId="person-shows-title"
      >
        {view.upcoming.length > 0 ? (
          <div
            aria-labelledby="person-shows-upcoming"
            className="hidden flex-col gap-1.5 lg:flex"
            role="group"
          >
            <span
              className="flex items-center gap-2 px-2.5 text-overline text-white/80 uppercase"
              id="person-shows-upcoming"
            >
              Upcoming
            </span>
            <div className={LIST}>
              {view.upcoming.map((row) => (
                <ShowRow key={row.id} personId={person.id} row={row} />
              ))}
            </div>
          </div>
        ) : null}
        <div className={LIST}>
          {view.shows.map((row) => (
            <ShowRow key={row.id} personId={person.id} row={row} />
          ))}
        </div>
      </ShowsList>
    </section>
  );
}
