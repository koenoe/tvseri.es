import { Suspense } from 'react';

import { notFound, permanentRedirect, unauthorized } from 'next/navigation';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import CardsContainer from '@/components/Track/CardsContainer';

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
        <Suspense
          fallback={
            <div className="flex animate-pulse flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-[7.5rem] flex-col gap-3 rounded-lg bg-white/5 p-6 md:h-[5.25rem] md:flex-row md:items-center"
                >
                  <div className="h-6 w-32 bg-white/15" />
                  <div className="h-8 w-full rounded bg-white/5 md:ml-auto md:w-48" />
                </div>
              ))}
            </div>
          }
        >
          <CardsContainer tvSeries={tvSeries} user={user} />
        </Suspense>
      </div>
    </>
  );
}
