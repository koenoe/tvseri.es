import type { Person } from '@tvseri.es/schemas';
import { Suspense } from 'react';
import {
  briefcaseGlyph,
  calendarGlyph,
  pinGlyph,
} from '@/components/ui/icon/glyphs';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadShows } from '@/lib/person/loaders';
import { departmentLabel, lifeFacts, occupationLabel } from '../../_lib/facts';
import { nameFit } from '../../_lib/nameFit';
import { PERSON_SIDE_HEADER, PERSON_SIDEBAR } from '../layout';
import WatchedHole, { WatchedPlaceholder } from '../watched/WatchedHole';
import Bio from './Bio';
import Fact, { FACTS } from './Fact';
import FamilyFacts, { FamilyFactsSkeleton } from './FamilyFacts';
import Links, { LinksFallback } from './Links';
import Portrait from './Portrait';

/** "Actor, director, producer" from the credits; the department until then */
async function Occupation({
  department,
  id,
}: Readonly<{ department?: string; id: number }>) {
  const shows = await loadShows(id);
  const label =
    shows && !isUnavailable(shows)
      ? occupationLabel([...shows.shows, ...shows.upcoming], department)
      : departmentLabel(department);
  return label ? <Fact icon={briefcaseGlyph}>{label}</Fact> : null;
}

/**
 * Who he is: sticky
 * 300px sidebar on desktop; on phones the header of the page, a 112px
 * portrait beside the name and facts. Order: portrait, name, (years), facts,
 * links, bio, family and awards, the viewer's watched line.
 */
export default function Sidebar({ person }: Readonly<{ person: Person }>) {
  const life = lifeFacts(person);
  const department = departmentLabel(person.knownForDepartment);
  const occupationFallback = department ? (
    <Fact icon={briefcaseGlyph}>{department}</Fact>
  ) : null;
  const died = !!person.deathdate;
  const bio = person.biography?.trim();
  const nameStyle = nameFit(person.name);

  return (
    <aside aria-label={`About ${person.name}`} className={PERSON_SIDEBAR}>
      <div className={PERSON_SIDE_HEADER}>
        <Portrait image={person.image} name={person.name} />
        <section
          aria-label="Profile"
          className="@container flex w-full min-w-0 flex-col gap-2 lg:gap-4.5"
        >
          <h1
            className="font-display text-display text-balance"
            style={nameStyle}
          >
            {person.name}
          </h1>
          {life.years ? (
            <div className="text-meta text-white/60 tabular-nums lg:-mt-1.5 lg:mb-3.5">
              {life.years}
            </div>
          ) : null}
          <div className={FACTS}>
            {life.facts.map((fact) => (
              <Fact
                icon={fact.icon === 'calendar' ? calendarGlyph : pinGlyph}
                key={fact.icon}
              >
                {fact.text}
              </Fact>
            ))}
            <Suspense fallback={occupationFallback}>
              <Occupation
                department={person.knownForDepartment}
                id={person.id}
              />
            </Suspense>
          </div>
        </section>
      </div>
      <div className="empty:hidden lg:-mt-2.5">
        <Suspense
          fallback={<LinksFallback imdbId={person.imdbId} name={person.name} />}
        >
          <Links id={person.id} imdbId={person.imdbId} name={person.name} />
        </Suspense>
      </div>
      {bio ? <Bio text={bio} /> : null}
      <Suspense fallback={<FamilyFactsSkeleton />}>
        <FamilyFacts died={died} id={person.id} />
      </Suspense>
      <Suspense fallback={<WatchedPlaceholder />}>
        <WatchedHole gender={person.gender} id={person.id} />
      </Suspense>
    </aside>
  );
}
