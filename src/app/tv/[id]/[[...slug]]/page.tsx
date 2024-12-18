import { cache, Suspense } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import ActionButtons from '@/components/Buttons/ActionButtons';
import Cast from '@/components/Cast/Cast';
import ContentRating from '@/components/ContentRating/ContentRating';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import EpisodesList from '@/components/List/EpisodesList';
import RecommendationsList from '@/components/List/RecommendationsList';
import Page from '@/components/Page/Page';
import PreferredImagesForAdminContainer from '@/components/PreferredImagesForAdmin/PreferredImagesForAdminContainer';
import ImdbRating from '@/components/Rating/ImdbRating';
import SkeletonAvatars from '@/components/Skeletons/SkeletonAvatars';
import SkeletonCircleButton from '@/components/Skeletons/SkeletonCircleButton';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import SkeletonRating from '@/components/Skeletons/SkeletonRating';
import AddTvSeriesToStoreContainer from '@/components/Watched/AddTvSeriesToStoreContainer';
import ValidateWatchedStatus from '@/components/Watched/ValidateWatchedStatus';
import WatchedProgress from '@/components/Watched/WatchedProgress';
import WatchProvider from '@/components/WatchProvider/WatchProvider';
import { fetchTvSeries } from '@/lib/tmdb';
import getBaseUrl from '@/utils/getBaseUrl';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

const cachedTvSeries = cache(async (id: string) =>
  fetchTvSeries(id, {
    includeImages: true,
  }),
);

export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

export async function generateMetadata({ params: paramsFromProps }: Props) {
  const params = await paramsFromProps;
  const tvSeries = await cachedTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return {};
  }

  const slug = params.slug?.join('');

  if (tvSeries.slug && tvSeries.slug !== slug) {
    return permanentRedirect(`/tv/${params.id}/${tvSeries.slug}`);
  }

  const canonicalUrl = `${getBaseUrl()}/tv/${params.id}/${tvSeries.slug}`;

  return {
    title: tvSeries.title,
    description: tvSeries.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: tvSeries.title,
      description: tvSeries.description,
      url: canonicalUrl,
      siteName: 'tvseri.es',
      images: tvSeries.posterImage
        ? [
            {
              url: tvSeries.posterImage,
              width: 300,
              height: 450,
              alt: `${tvSeries.title} poster`,
            },
          ]
        : undefined,
      locale: 'en_US',
      type: 'video.tv_show',
    },
  };
}

export default async function TvSeriesDetailsPage({
  params: paramsFromProps,
}: Props) {
  const params = await paramsFromProps;
  const tvSeries = await cachedTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  const slug = params.slug?.join('');

  if (tvSeries.slug && tvSeries.slug !== slug) {
    return permanentRedirect(`/tv/${params.id}/${tvSeries.slug}`);
  }

  return (
    <>
      <Suspense fallback={null}>
        <AddTvSeriesToStoreContainer tvSeries={tvSeries} />
        <ValidateWatchedStatus tvSeries={tvSeries} />
      </Suspense>
      <Page
        backgroundColor={tvSeries.backdropColor}
        backgroundImage={tvSeries.backdropImage}
        backgroundVariant="dynamic"
        backgroundContext="page"
        usePersistentStore={false}
      >
        <div className="container">
          <div className="relative flex h-[calc(85vh-16rem)] items-end md:h-[calc(65vh-8rem)]">
            <div className="w-full xl:w-4/5 2xl:w-3/5">
              {tvSeries.titleTreatmentImage ? (
                <h1 className="relative mb-6 h-28 w-full md:h-40 md:w-[500px]">
                  <Image
                    id="title-treatment"
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

              <div className="mb-4 flex w-full gap-4 md:gap-12">
                <div className="flex w-full items-center gap-1 whitespace-nowrap text-xs md:gap-2 md:text-[0.8rem]">
                  <div className="opacity-60">{tvSeries.releaseYear}</div>
                  <div className="opacity-60 before:mr-1 before:content-['·'] md:before:mr-2">
                    {tvSeries.numberOfSeasons}{' '}
                    {tvSeries.numberOfSeasons === 1 ? 'Season' : 'Seasons'}
                  </div>
                  {tvSeries.genres.length > 0 && (
                    <>
                      <div className="hidden opacity-60 before:mr-1 before:content-['·'] md:block md:before:mr-2">
                        {tvSeries.genres.map((genre, index) => (
                          <Link
                            key={genre.id}
                            href={`/discover?with_genres=${genre.id}`}
                            className="hover:underline"
                          >
                            {genre.name}
                            {index < tvSeries.genres.length - 1 ? ', ' : ''}
                          </Link>
                        ))}
                      </div>
                      <div className="opacity-60 before:mr-1 before:content-['·'] md:hidden md:before:mr-2">
                        <Link
                          href={`/discover?with_genres=${tvSeries.genres?.[0].id}`}
                          className="hover:underline"
                        >
                          {tvSeries.genres?.[0].name}
                        </Link>
                      </div>
                    </>
                  )}

                  <div className="ml-auto flex h-7 gap-2 md:ml-10">
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
              <WatchedProgress tvSeries={tvSeries} />
            </div>
          </div>
          <div className="w-full xl:w-4/5 2xl:w-3/5">
            <ExpandableText className="mb-6">
              {tvSeries.description}
            </ExpandableText>

            <div className="mb-6 flex items-center">
              <Suspense
                fallback={<SkeletonRating className="mr-auto md:mr-10" />}
              >
                <ImdbRating id={tvSeries.id} className="mr-auto md:mr-10" />
              </Suspense>
              <div className="flex gap-3">
                <Suspense
                  fallback={
                    <>
                      <SkeletonCircleButton />
                      <SkeletonCircleButton />
                      <SkeletonCircleButton />
                    </>
                  }
                >
                  <ActionButtons id={tvSeries.id} />
                </Suspense>
              </div>
            </div>

            <div className="flex flex-col text-sm font-light">
              {tvSeries.createdBy.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-2 font-medium leading-loose">
                  <span className="opacity-60">Created by:</span>
                  {tvSeries.createdBy.map((creator, index) => (
                    <Link
                      key={creator.id}
                      href={`/person/${creator.id}/${creator.slug}`}
                    >
                      {creator.name}
                      {index < tvSeries.createdBy.length - 1 ? ',' : ''}
                    </Link>
                  ))}
                </p>
              )}

              {/* {tvSeries.languages.length > 0 && (
              <p className="flex items-center gap-2 font-medium leading-loose">
                <span className="opacity-60">Spoken languages:</span>
                {tvSeries.languages
                  .map((language) => language.englishName)
                  .join(', ')}
              </p>
            )}

            {tvSeries.countries.length > 0 && (
              <p className="flex items-center gap-2 font-medium leading-loose">
                <span className="opacity-60">Country of origin:</span>
                {tvSeries.countries[0].name}
              </p>
            )} */}
            </div>
          </div>

          <Suspense
            fallback={
              <SkeletonAvatars className="my-10 w-full lg:mb-7 lg:mt-14 xl:w-4/5 2xl:w-3/5" />
            }
          >
            <Cast
              className="my-10 w-full lg:mb-7 lg:mt-14 xl:w-4/5 2xl:w-3/5"
              id={tvSeries.id}
            />
          </Suspense>
        </div>
        {tvSeries.numberOfEpisodes > 0 && tvSeries.seasons && (
          <EpisodesList className="mb-10 md:mb-16" item={tvSeries} />
        )}
        <Suspense fallback={<SkeletonList />}>
          <RecommendationsList id={tvSeries.id} />
        </Suspense>

        <Suspense fallback={null}>
          <PreferredImagesForAdminContainer tvSeries={tvSeries} />
        </Suspense>
      </Page>
    </>
  );
}
