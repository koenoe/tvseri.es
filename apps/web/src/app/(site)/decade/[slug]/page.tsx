import type { Metadata } from 'next';
import { Suspense } from 'react';

import { NOT_FOUND_METADATA } from '../../_discover/landing/notFoundMetadata';
import DecadeLanding, { DecadeLandingShell } from './_components/DecadeLanding';
import { decadeOf } from './_data/loaders';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** One sample slug (Cache Components needs one); others render on demand */
export const generateStaticParams = () => [{ slug: '2010s' }];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decade = decadeOf(slug);
  return decade
    ? {
        description: `The ${decade.label} on TV, sized by how many people rated each series, and the well-rated series most people missed.`,
        title: `The ${decade.label}`,
      }
    : NOT_FOUND_METADATA;
}

/**
 * `/decade/{yyyy}s`: the decade's landscape, a
 * treemap of its most-rated shows with the selected show's card, then the
 * shows most people missed. The frame and crumb are the cached shell; the
 * slug's parts stream in from cached loaders.
 */
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<DecadeLandingShell />}>
      <DecadeLanding params={params} />
    </Suspense>
  );
}
