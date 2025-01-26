import { Suspense } from 'react';

import { notFound, permanentRedirect, unauthorized } from 'next/navigation';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import EpisodesContainer from '@/components/Track/EpisodesContainer';
import EpisodesSkeleton from '@/components/Track/EpisodesSkeleton';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

export default async function TrackPageInModal({
  params: paramsFromProps,
}: Props) {
  const { user } = await auth();

  if (!user) {
    return unauthorized();
  }

  const params = await paramsFromProps;
  const tvSeries = await cachedTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  const slug = params.slug?.join('');

  if (tvSeries.slug && tvSeries.slug !== slug) {
    return permanentRedirect(`/track/${params.id}/${tvSeries.slug}`);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/90" />
      <div className="fixed left-1/2 top-1/2 z-50 h-full max-h-[calc(100vh-21rem)] w-full max-w-screen-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-12 shadow-xl">
        <Suspense fallback={<EpisodesSkeleton />}>
          <EpisodesContainer tvSeries={tvSeries} user={user} />
        </Suspense>
      </div>
    </>
  );
}
