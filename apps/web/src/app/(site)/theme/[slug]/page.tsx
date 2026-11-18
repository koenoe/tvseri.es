import { themeBySlug } from '@tvseri.es/constants';
import { upperFirst } from '@tvseri.es/utils';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { NOT_FOUND_METADATA } from '../../_discover/landing/notFoundMetadata';
import ThemeLanding, { ThemeLandingShell } from '../_components/ThemeLanding';
import { themeSeries } from '../_data/themeCopy';

/** One sample slug (Cache Components needs one); every other theme renders on first visit and is cached. */
export function generateStaticParams() {
  return [{ slug: 'dystopia' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/theme/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const theme = themeBySlug(slug);
  if (!theme) {
    return NOT_FOUND_METADATA;
  }
  return {
    description: `${theme.name} on TV: where to start, the best rated and the themes next door.`,
    title: upperFirst(themeSeries(slug, theme.name)),
  };
}

/**
 * `/theme/{slug}`: the theme's own ground from its
 * Start here show (`ThemeLanding`), prerendered per slug; before the slug is
 * known, a shell with no colour of its own and every section's place.
 */
export default function Page({ params }: PageProps<'/theme/[slug]'>) {
  return (
    <Suspense fallback={<ThemeLandingShell />}>
      <ThemeLanding params={params} />
    </Suspense>
  );
}
