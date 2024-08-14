import { Suspense } from 'react';

import Image from 'next/image';
import { notFound } from 'next/navigation';

import Cast from '@/components/Cast/Cast';
import ContentRating from '@/components/ContentRating/ContentRating';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import EpisodesList from '@/components/List/EpisodesList';
import RecommendationsList from '@/components/List/RecommendationsList';
import SimilarList from '@/components/List/SimilarList';
import PageModal from '@/components/Page/PageModal';
import SkeletonAvatars from '@/components/Skeletons/SkeletonAvatars';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import WatchProvider from '@/components/WatchProvider/WatchProvider';
import { fetchTvSeries } from '@/lib/tmdb';

type Props = Readonly<{
  params: { id: string; slug: string };
}>;

export async function generateMetadata({ params }: Props) {
  const tvSeries = await fetchTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  return {
    title: tvSeries.title,
    description: tvSeries.description,
    alternates: {
      // TODO: does this need to be absolute?
      canonical: `/tv/${params.id}/${tvSeries.slug}`,
    },
  };
}

export default async function TvSeriesDetailsModal({ params }: Props) {
  const tvSeries = await fetchTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  return (
    <PageModal
      id={`${tvSeries.id}`}
      backgroundColor={tvSeries.backdropColor}
      backgroundImage={tvSeries.backdropImage}
      backgroundVariant="static"
      backgroundContext="page"
    >
      <div className="container">
        <div className="relative flex h-[calc(95vh-16rem)] items-end md:h-[calc(70vh-8rem)]">
          <div className="relative w-full xl:w-4/5 2xl:w-3/5">
            {tvSeries.titleTreatmentImage ? (
              <h1 className="relative mb-6 h-28 w-full md:h-40 md:w-3/5">
                <Image
                  className="max-w-[500px] object-contain object-bottom md:object-left-bottom"
                  src={tvSeries.titleTreatmentImage}
                  alt=""
                  priority
                  fill
                  draggable={false}
                  unoptimized
                />
                <span className="hidden">{tvSeries.title}</span>
              </h1>
            ) : (
              <h1 className="relative mb-6 w-full text-center text-3xl font-bold !leading-tight md:w-3/5 md:text-left md:text-4xl lg:text-5xl xl:text-6xl">
                {tvSeries.title}
              </h1>
            )}

            <div className="mb-6 flex w-full gap-4 md:gap-12">
              <div className="flex w-full items-center gap-1 whitespace-nowrap text-xs md:gap-2 md:text-[0.8rem]">
                <div className="opacity-60">{tvSeries.releaseYear}</div>
                <div className="opacity-60 before:mr-1 before:content-['·'] md:before:mr-2">
                  {tvSeries.numberOfSeasons}{' '}
                  {tvSeries.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
                </div>
                {tvSeries.genres.length > 0 && (
                  <>
                    {/* TODO: <Link /> to genre pages */}
                    <div className="hidden opacity-60 before:mr-1 before:content-['·'] md:block md:before:mr-2">
                      {tvSeries.genres.map((genre) => genre.name).join(', ')}
                    </div>
                    <div className="opacity-60 before:mr-1 before:content-['·'] md:hidden md:before:mr-2">
                      {tvSeries.genres?.[0].name}
                    </div>
                  </>
                )}

                <div className="ml-auto flex h-7 gap-2 md:ml-8">
                  <Suspense
                    fallback={
                      <div className="flex h-7 min-w-7 animate-pulse rounded-sm bg-white/30" />
                    }
                  >
                    <ContentRating id={tvSeries.id} />
                  </Suspense>
                  <Suspense
                    fallback={
                      <div className="flex h-7 min-w-7 animate-pulse rounded bg-white/30" />
                    }
                  >
                    <WatchProvider id={tvSeries.id} />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full xl:w-4/5 2xl:w-3/5">
          <ExpandableText className="mb-6">
            {tvSeries.description}
          </ExpandableText>
          {tvSeries.createdBy.length > 0 && (
            <p className="inline-flex gap-3 text-sm leading-loose">
              <span className="opacity-60">Created by:</span>
              {/* TODO: <Link /> to person pages */}
              {tvSeries.createdBy.map((creator) => creator.name).join(', ')}
            </p>
          )}
        </div>

        <Suspense
          fallback={
            <SkeletonAvatars className="my-14 w-full lg:mb-7 lg:mt-14 xl:w-4/5 2xl:w-3/5" />
          }
        >
          <Cast
            className="my-14 w-full lg:mb-7 lg:mt-14 xl:w-4/5 2xl:w-3/5"
            id={tvSeries.id}
          />
        </Suspense>
      </div>
      {tvSeries.numberOfEpisodes > 0 && (
        <EpisodesList className="mb-10 md:mb-16" item={tvSeries} />
      )}
      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <RecommendationsList
          id={tvSeries.id}
          className="mb-10 md:mb-16"
          replace
        />
      </Suspense>
      <Suspense fallback={<SkeletonList />}>
        <SimilarList id={tvSeries.id} replace />
      </Suspense>
    </PageModal>
  );
}
