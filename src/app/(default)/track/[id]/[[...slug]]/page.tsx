import { Suspense } from 'react';

import { notFound, permanentRedirect, unauthorized } from 'next/navigation';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import ActionButtons from '@/components/Buttons/ActionButtons';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import InfoLine from '@/components/InfoLine/InfoLine';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import Poster from '@/components/Tiles/Poster';
import EpisodesContainer from '@/components/Track/EpisodesContainer';
import EpisodesSkeleton from '@/components/Track/EpisodesSkeleton';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

export default async function TrackPage({ params: paramsFromProps }: Props) {
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
      <div className="flex gap-10">
        <Poster
          item={tvSeries}
          size="small"
          className="hidden flex-shrink-0 md:block"
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
              <ActionButtons id={tvSeries.id} showWatchButton={false} />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="mt-10">
        <Suspense fallback={<EpisodesSkeleton />}>
          <EpisodesContainer tvSeries={tvSeries} user={user} />
        </Suspense>
      </div>
    </>
  );
}
