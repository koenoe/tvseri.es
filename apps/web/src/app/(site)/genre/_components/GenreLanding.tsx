import { Suspense } from 'react';

import {
  LandingHeroSkeleton,
  LandingPage,
  LandingShell,
} from '../../_discover/landing';
import { genreLook } from '../_data/look';
import GenreCrumb from './GenreCrumb';
import GenreHero from './GenreHero';
import GenreSections, { GenreSectionsSkeleton } from './GenreSections';
import { genreForSlug } from './genreSlug';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** The page before the slug is known: no colour of its own (`LandingShell`), the crumb, every section's place */
export function GenreLandingShell() {
  return (
    <LandingShell>
      <LandingHeroSkeleton crumb={<GenreCrumb />} facts={4} />
      <GenreSectionsSkeleton />
    </LandingShell>
  );
}

/**
 * `/genre/{slug}` on the genre's own ground and glow
 * (`genreLook`), prerendered per slug with them, so the first frame has the
 * colour; then the hero and the rows, each streamed on its own.
 */
export default async function GenreLanding({ params }: Props) {
  const { slug } = await params;
  // `notFound()` for a slug that isn't a genre landing
  genreForSlug(slug);
  const look = await genreLook(slug);
  const heroSkeleton = (
    <LandingHeroSkeleton crumb={<GenreCrumb />} facts={4} glow={look.glow} />
  );
  return (
    <LandingPage ground={look.ground}>
      <Suspense fallback={heroSkeleton}>
        <GenreHero glow={look.glow} params={params} />
      </Suspense>
      <Suspense fallback={<GenreSectionsSkeleton />}>
        <GenreSections params={params} />
      </Suspense>
    </LandingPage>
  );
}
