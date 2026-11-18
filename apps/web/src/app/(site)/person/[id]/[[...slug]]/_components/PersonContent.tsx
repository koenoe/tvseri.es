import type { Person } from '@tvseri.es/schemas';
import Page from '@/components/background/Page';
import GuardedSection from '@/components/ui/row/GuardedSection';

import Awards from './awards/Awards';
import Collaborators from './Collaborators';
import Career from './career/Career';
import KnownFor, { KnownForSkeleton } from './KnownFor';
import { PERSON_COLUMN, PERSON_MAIN } from './layout';
import {
  AwardsSkeleton,
  CareerSkeleton,
  CollaboratorsSkeleton,
} from './Skeletons';
import Shows, { ShowsSkeleton } from './shows/Shows';
import Sidebar from './sidebar/Sidebar';

/**
 * The person page: the sidebar (the header on phones), then Known for, Career, Shows, Frequent collaborators
 * and Awards (the three TV sections only for a person with a TV credit). Shared content is cached per person and prerendered; each
 * slower section streams on its own, never blocking the hero (a failure stays
 * in that section, with Try again); the viewer's
 * watched line is the one request-time hole.
 */
export default function PersonContent({
  person,
  tvCredits,
}: Readonly<{
  person: Person;
  /** False for a person with no TV credit: Career, Shows and Frequent collaborators would be empty */
  tvCredits: boolean;
}>) {
  return (
    <Page>
      <div
        className={PERSON_MAIN}
        data-slot="person"
        data-testid="route-person"
      >
        <Sidebar person={person} />
        <div className={PERSON_COLUMN} data-slot="person-column">
          <GuardedSection
            fallback={<KnownForSkeleton />}
            id="person-known-for"
            inset="flush"
            title="Known for"
          >
            <KnownFor id={person.id} />
          </GuardedSection>
          {tvCredits ? (
            <>
              <GuardedSection
                fallback={<CareerSkeleton />}
                id="person-career"
                inset="flush"
                title="Career"
              >
                <Career person={person} />
              </GuardedSection>
              <GuardedSection
                fallback={<ShowsSkeleton />}
                id="person-shows"
                inset="flush"
                title="Series"
              >
                <Shows person={person} />
              </GuardedSection>
              <GuardedSection
                fallback={<CollaboratorsSkeleton />}
                id="person-collaborators"
                inset="flush"
                title="Frequent collaborators"
              >
                <Collaborators id={person.id} />
              </GuardedSection>
            </>
          ) : null}
          <GuardedSection
            fallback={<AwardsSkeleton />}
            id="person-awards"
            inset="flush"
            title="Awards"
          >
            <Awards id={person.id} name={person.name} />
          </GuardedSection>
        </div>
      </div>
    </Page>
  );
}
