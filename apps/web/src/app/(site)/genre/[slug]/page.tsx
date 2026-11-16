import type { Metadata } from 'next';
import { Suspense } from 'react';

import { genreNameBySlug } from '../../_discover/data/genreNames';
import { NOT_FOUND_METADATA } from '../../_discover/landing/notFoundMetadata';
import GenreLanding, { GenreLandingShell } from '../_components/GenreLanding';
import { genreLine } from '../_data/genreLines';

/** One sample slug (Cache Components needs one); every other genre renders on first visit and is cached. */
export function generateStaticParams() {
  return [{ slug: 'crime' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/genre/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const name = genreNameBySlug(slug);
  return name
    ? { description: genreLine(slug), title: `${name} series` }
    : NOT_FOUND_METADATA;
}

/**
 * `/genre/{slug}`: the genre's own ground and glow
 * from its lead show (`GenreLanding`), prerendered per slug; before the slug
 * is known, the designed ground with every section's place.
 */
export default function Page({ params }: PageProps<'/genre/[slug]'>) {
  return (
    <Suspense fallback={<GenreLandingShell />}>
      <GenreLanding params={params} />
    </Suspense>
  );
}
