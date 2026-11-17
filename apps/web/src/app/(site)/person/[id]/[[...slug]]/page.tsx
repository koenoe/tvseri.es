import type { Metadata } from 'next';
import { Suspense } from 'react';

import { isUnavailable } from '@/lib/cache/unavailable';
import { entityMetadata } from '@/lib/routing/entityRoute';

import PersonRoute from './_components/PersonRoute';
import PersonSkeleton from './_components/PersonSkeleton';
import { loadPerson } from './_data/loaders';
import { PERSON_ROUTE } from './_data/route';
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
  return entityMetadata(await params, PERSON_ROUTE, (person) => ({
    description: summary(person.biography),
    image: person.image
      ? { alt: person.name, height: 900, url: person.image, width: 600 }
      : undefined,
    title: person.name,
    type: 'profile',
  }));
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
