import { notFound, permanentRedirect, unauthorized } from 'next/navigation';
import { Suspense } from 'react';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import ActionButtons from '@/components/Buttons/ActionButtons';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import InfoLine from '@/components/InfoLine/InfoLine';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import Poster from '@/components/Tiles/Poster';
import CardsContainer from '@/components/Track/CardsContainer';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

export default async function TrackPage({ params: paramsFromProps }: Props) {
  const { user, encryptedSessionId } = await auth();

  if (!user || !encryptedSessionId) {
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
      <div className="flex gap-10">
        <Poster
          className="hidden flex-shrink-0 md:block"
          item={tvSeries}
          size="small"
        />
        <div className="relative w-full">
          <h1 className="mb-2 text-lg font-medium lg:text-xl">
            {tvSeries.title}
          </h1>
          <InfoLine tvSeries={tvSeries} />
          <ExpandableText className="mt-4 hidden w-full max-w-4xl text-sm md:block">
            {tvSeries.description}
          </ExpandableText>
          <div className="mt-4 flex gap-3">
            <Suspense
              fallback={
                <>
                  <SkeletonCircleButton />
                  <SkeletonCircleButton />
                </>
              }
            >
              <ActionButtons
                id={tvSeries.id}
                showContextMenuButton={false}
                showWatchButton={false}
              />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="mt-10 bg-neutral-900">
        <Suspense
          fallback={
            <div className="flex animate-pulse flex-col gap-4">
              {Array.from({ length: tvSeries.numberOfSeasons }).map((_, i) => (
                <div
                  className="flex h-[7.5rem] flex-col gap-3 rounded-lg bg-white/5 p-6 md:h-[5.25rem] md:flex-row md:items-center"
                  key={i}
                >
                  <div className="h-6 w-32 bg-white/15" />
                  <div className="h-8 w-full rounded bg-white/5 md:ml-auto md:w-48" />
                </div>
              ))}
            </div>
          }
        >
          <CardsContainer
            sessionId={encryptedSessionId}
            tvSeries={tvSeries}
            user={user}
          />
        </Suspense>
      </div>
    </>
  );
}
