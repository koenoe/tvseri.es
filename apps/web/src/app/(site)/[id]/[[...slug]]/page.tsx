import type { Metadata } from 'next';
import { Suspense } from 'react';

import { entityMetadata } from '@/lib/routing/entityRoute';
import ShowRoute from './_components/ShowRoute';
import ShowSkeleton from './_components/ShowSkeleton';
import { loadShow } from './_data/loaders';
import { SHOW_ROUTE } from './_data/route';

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
  return entityMetadata(await params, SHOW_ROUTE, (series) => ({
    description: series.description,
    image: series.posterImage
      ? {
          alt: `${series.title} poster`,
          height: 450,
          url: series.posterImage,
          width: 300,
        }
      : undefined,
    title: series.title,
    type: 'video.tv_show',
  }));
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
