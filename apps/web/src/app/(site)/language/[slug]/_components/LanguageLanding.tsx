import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { languageName } from '../../../_discover/data/languageName';
import { LandingPage, LandingShell } from '../../../_discover/landing';
import { languageLook } from '../_data/look';
import {
  LanguageHeading,
  LanguageHeadingSkeleton,
  LanguageHeroFrame,
} from './LanguageHero';
import LanguageSections, { LanguageSectionsSkeleton } from './LanguageSections';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** The page before the slug is known: no colour of its own (`LandingShell`), the frame and every section's place */
export function LanguageLandingShell() {
  return (
    <LandingShell>
      <LanguageHeroFrame>
        <LanguageHeadingSkeleton />
      </LanguageHeroFrame>
      <LanguageSectionsSkeleton />
    </LandingShell>
  );
}

/**
 * `/language/{code}` on the language's own ground, from its most-rated show
 * (Start here's first, the same cached list), prerendered per slug with it.
 */
export default async function LanguageLanding({ params }: Props) {
  const { slug } = await params;
  if (!languageName(slug)) {
    notFound();
  }
  const look = await languageLook(slug);
  return (
    <LandingPage ground={look.ground}>
      <LanguageHeroFrame>
        <Suspense fallback={<LanguageHeadingSkeleton />}>
          <LanguageHeading params={params} />
        </Suspense>
      </LanguageHeroFrame>
      <Suspense fallback={<LanguageSectionsSkeleton />}>
        <LanguageSections params={params} />
      </Suspense>
    </LandingPage>
  );
}
