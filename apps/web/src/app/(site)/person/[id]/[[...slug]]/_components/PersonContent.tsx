import type { Person } from '@tvseri.es/schemas';
import { type ReactNode, Suspense } from 'react';

import Page from '@/components/background/Page';
import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';

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
 * One section of the column: streams on its own behind its placeholder, and
 * a failure stays in that section (`RowErrorBoundary`, with Try again).
 */
function Section({
  children,
  fallback,
  id,
  title,
}: Readonly<{
  children: ReactNode;
  fallback: ReactNode;
  id: string;
  title: string;
}>) {
  return (
    <RowErrorBoundary id={id} inset="flush" title={title}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </RowErrorBoundary>
  );
}

/**
 * The person page: the sidebar (the header on phones), then Known for, Career, Shows, Frequent collaborators
 * and Awards (the three TV sections only for a person with a TV credit). Shared content is cached per person and prerendered; each
 * slower section streams on its own, never blocking the hero; the viewer's
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
          <Section
            fallback={<KnownForSkeleton />}
            id="person-known-for"
            title="Known for"
          >
            <KnownFor id={person.id} />
          </Section>
          {tvCredits ? (
            <>
              <Section
                fallback={<CareerSkeleton />}
                id="person-career"
                title="Career"
              >
                <Career person={person} />
              </Section>
              <Section
                fallback={<ShowsSkeleton />}
                id="person-shows"
                title="Series"
              >
                <Shows person={person} />
              </Section>
              <Section
                fallback={<CollaboratorsSkeleton />}
                id="person-collaborators"
                title="Frequent collaborators"
              >
                <Collaborators id={person.id} />
              </Section>
            </>
          ) : null}
          <Section
            fallback={<AwardsSkeleton />}
            id="person-awards"
            title="Awards"
          >
            <Awards id={person.id} name={person.name} />
          </Section>
        </div>
      </div>
    </Page>
  );
}
