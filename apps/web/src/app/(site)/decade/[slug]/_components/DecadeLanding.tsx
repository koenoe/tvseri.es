import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { LandingPage, LandingShell } from '../../../_discover/landing';
import { decadeOf } from '../_data/loaders';
import { decadeLook } from '../_data/look';
import {
  DecadeHeading,
  DecadeHeadingSkeleton,
  DecadeHeroFrame,
} from './DecadeHero';
import {
  DecadeLandscapeFallback,
  DecadeLandscapeSection,
  DecadeSections,
  DecadeSectionsSkeleton,
} from './DecadeSections';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** The page before the slug is known: no colour of its own (`LandingShell`), the frame and every section's place */
export function DecadeLandingShell() {
  return (
    <LandingShell>
      <DecadeHeroFrame>
        <DecadeHeadingSkeleton />
      </DecadeHeroFrame>
      <DecadeLandscapeFallback />
      <DecadeSectionsSkeleton />
    </LandingShell>
  );
}

/**
 * `/decade/{yyyy}s` on the decade's own ground, from its most-rated show
 * (the treemap's first, the same cached list), prerendered per slug with it.
 */
export default async function DecadeLanding({ params }: Props) {
  const { slug } = await params;
  if (!decadeOf(slug)) {
    notFound();
  }
  const look = await decadeLook(slug);
  return (
    <LandingPage ground={look.ground}>
      <DecadeHeroFrame>
        <Suspense fallback={<DecadeHeadingSkeleton />}>
          <DecadeHeading params={params} />
        </Suspense>
      </DecadeHeroFrame>
      <Suspense fallback={<DecadeLandscapeFallback />}>
        <DecadeLandscapeSection params={params} />
      </Suspense>
      <Suspense fallback={<DecadeSectionsSkeleton />}>
        <DecadeSections params={params} />
      </Suspense>
    </LandingPage>
  );
}
