import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { isUnavailable } from '@/lib/cache/unavailable';
import getBaseUrl from '@/lib/getBaseUrl';
import { canonicalPath, toCanonicalId } from '@/lib/routing/canonical';
import personPath from '@/lib/routing/personPath';

import PersonRoute from './_components/PersonRoute';
import PersonSkeleton from './_components/PersonSkeleton';
import { loadPerson } from './_data/loaders';
import { summary } from './_lib/format';

type Props = Readonly<{
  params: Promise<{ id: string; slug?: string[] }>;
}>;

// Bryan Cranston: a long-lived id, so the build always renders a real page.
const SEED_ID = '17419';

/**
 * Seed only. With one `{ id, slug }` here, every other person gets a cached
 * page of its own on its first visit (no large set at build). The slug comes
 * from the API so the seed is the canonical URL; without the API (a build
 * with `API_URL` unset) the seed is the bare id and prerenders the
 * placeholder, which regenerates once the API answers.
 */
export async function generateStaticParams() {
  const result = await loadPerson(Number(SEED_ID));
  const slug =
    !isUnavailable(result) && result.status === 'ok' && result.person.slug
      ? [result.person.slug]
      : [];
  return [{ id: SEED_ID, slug }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const id = toCanonicalId(resolved.id);
  const result = id ? await loadPerson(Number(id)) : null;
  // The 404 status (the view itself is PersonRoute's)
  if (!result || (!isUnavailable(result) && result.status === 'not-found')) {
    notFound();
  }
  if (isUnavailable(result)) {
    return {};
  }
  const { person } = result;
  const url = `${getBaseUrl()}${personPath(person.id, person.slug)}`;
  // A stale slug redirects in the page (in the stream, so client-side on a
  // first visit): point crawlers at the canonical URL meanwhile
  if (canonicalPath(resolved, person, personPath)) {
    return { alternates: { canonical: url }, robots: { index: false } };
  }
  const description = summary(person.biography);
  const images = person.image
    ? [{ alt: person.name, height: 900, url: person.image, width: 600 }]
    : undefined;
  return {
    alternates: { canonical: url },
    description,
    openGraph: {
      description,
      images,
      locale: 'en_US',
      siteName: 'tvseri.es',
      title: person.name,
      type: 'profile',
      url,
    },
    title: person.name,
  };
}

/**
 * The person page. A cached shell per
 * person: the params resolve inside Suspense, the sections read cached
 * loaders, and only the viewer's watched line is a request-time hole.
 */
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<PersonSkeleton />}>
      <PersonRoute params={params} />
    </Suspense>
  );
}
