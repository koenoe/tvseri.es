import type { Metadata } from 'next';
import { Suspense } from 'react';
import { countryNames } from '../../_discover/data/countryNames';
import { NOT_FOUND_METADATA } from '../../_discover/landing/notFoundMetadata';
import CountryLanding, {
  CountryLandingShell,
  isCountrySlug,
} from '../_components/CountryLanding';

/** One sample code (Cache Components needs one); every other country renders on demand and is cached */
export function generateStaticParams() {
  return [{ slug: 'gb' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/country/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  if (!isCountrySlug(slug)) {
    return NOT_FOUND_METADATA;
  }
  const { name } = countryNames(slug);
  return {
    description: `Series from ${name}: where to start, who makes them and what’s new.`,
    title: name,
  };
}

export default function Page({ params }: PageProps<'/country/[slug]'>) {
  return (
    <Suspense fallback={<CountryLandingShell />}>
      <CountryLanding params={params} />
    </Suspense>
  );
}
