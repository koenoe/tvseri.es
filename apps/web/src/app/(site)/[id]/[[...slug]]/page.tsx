import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { isUnavailable } from '@/lib/cache/unavailable';
import getBaseUrl from '@/lib/getBaseUrl';
import { canonicalPath, toCanonicalId } from '@/lib/routing/canonical';
import showPath from '@/lib/routing/showPath';
import ShowRoute from './_components/ShowRoute';
import ShowSkeleton from './_components/ShowSkeleton';
import { loadShow } from './_data/loaders';

type Props = Readonly<{
  params: Promise<{ id: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

// The Bear: a long-lived id, so the build always renders a real page.
const SEED_ID = '136315';

/**
 * Seed only. With at least one `{ id, slug }` here, every other show gets its
 * own cached shell after its first visit; without it all visits would share
 * one fallback shell. The slug comes from the API, so the seed is the
 * canonical URL, not a redirect.
 */
export async function generateStaticParams() {
  const show = await loadShow(Number(SEED_ID));
  // Without the API (a build with API_URL unset) the seed is the bare id: it
  // prerenders the placeholder, which regenerates once the API answers.
  return [
    {
      id: SEED_ID,
      slug: 'status' in show && show.status === 'ok' ? [show.series.slug] : [],
    },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const id = toCanonicalId(resolved.id);
  const show = id ? await loadShow(Number(id)) : null;
  // The 404 status (the view itself is ShowRoute's: see there why)
  if (!show || (!isUnavailable(show) && show.status === 'not-found')) {
    notFound();
  }
  if (isUnavailable(show)) {
    return {};
  }
  const { series } = show;
  const url = `${getBaseUrl()}${showPath(series.id, series.slug)}`;
  // A stale slug redirects in the page (in the stream, so a client-side
  // redirect on a first visit): it points crawlers at the canonical URL.
  if (canonicalPath(resolved, series, showPath)) {
    return { alternates: { canonical: url }, robots: { index: false } };
  }
  const images = series.posterImage
    ? [
        {
          alt: `${series.title} poster`,
          height: 450,
          url: series.posterImage,
          width: 300,
        },
      ]
    : undefined;
  return {
    alternates: { canonical: url },
    description: series.description,
    openGraph: {
      description: series.description,
      images,
      locale: 'en_US',
      siteName: 'tvseri.es',
      title: series.title,
      type: 'video.tv_show',
      url,
    },
    title: series.title,
  };
}

/**
 * The show page. A cached shell per show: the show renders from cached loaders in a Suspense
 * child, viewer parts in their own holes, overlays in client islands that
 * read the URL. `searchParams` is read only on the redirect branch.
 */
export default function Page({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ShowSkeleton />}>
      <ShowRoute params={params} searchParams={searchParams} />
    </Suspense>
  );
}
