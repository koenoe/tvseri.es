import { Suspense } from 'react';

import {
  LandingHeroSkeleton,
  LandingPage,
  LandingShell,
} from '../../_discover/landing';
import { themeLook } from '../_data/look';
import ThemeCrumb from './ThemeCrumb';
import ThemeHero from './ThemeHero';
import ThemeSections, { ThemeSectionsSkeleton } from './ThemeSections';
import { themeForSlug } from './themeSlug';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

const heroSkeleton = (
  <LandingHeroSkeleton aside chipsHeading crumb={<ThemeCrumb />} line={false} />
);

/** The page before the slug is known: no colour of its own (`LandingShell`), the crumb, every section's place */
export function ThemeLandingShell() {
  return (
    <LandingShell>
      {heroSkeleton}
      <ThemeSectionsSkeleton />
    </LandingShell>
  );
}

/**
 * `/theme/{slug}` on the theme's own ground, from its
 * Start here show (`themeLook`), prerendered per slug with it; then the hero
 * and the rows, each streamed on its own.
 */
export default async function ThemeLanding({ params }: Props) {
  const { slug } = await params;
  // `notFound()` for a slug that isn't a theme landing
  themeForSlug(slug);
  const look = await themeLook(slug);
  return (
    <LandingPage ground={look.ground}>
      <Suspense fallback={heroSkeleton}>
        <ThemeHero params={params} />
      </Suspense>
      <Suspense fallback={<ThemeSectionsSkeleton />}>
        <ThemeSections params={params} />
      </Suspense>
    </LandingPage>
  );
}
