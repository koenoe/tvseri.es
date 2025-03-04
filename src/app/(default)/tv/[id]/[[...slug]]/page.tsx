import { Suspense } from 'react';

import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';

import { cachedTvSeries } from '@/app/cached';
import ActionButtons from '@/components/Buttons/ActionButtons';
import Cast from '@/components/Cast/Cast';
import ContentRating from '@/components/ContentRating/ContentRating';
import ExpandableCreators from '@/components/ExpandableList/ExpandableCreators';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import InfoLine from '@/components/InfoLine/InfoLine';
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
import getBaseUrl from '@/utils/getBaseUrl';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

export const dynamic = 'force-dynamic';

export async function generateViewport({ params: paramsFromProps }: Props) {
  const params = await paramsFromProps;
  const tvSeries = await cachedTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return {};
  }

  return {
    themeColor: tvSeries.backdropColor,
  };
}

export async function generateMetadata({ params: paramsFromProps }: Props) {
  const params = await paramsFromProps;
  const tvSeries = await cachedTvSeries(params.id);

  if (!tvSeries || tvSeries.isAdult) {
    return {};
  }

  const slug = params.slug?.join('');

  if (tvSeries.slug && tvSeries.slug !== slug) {
    return {};
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
    <Page
      backgroundColor={tvSeries.backdropColor}
      backgroundImage={tvSeries.backdropImage}
      backgroundVariant="dynamic"
      backgroundContext="page"
      usePersistentStore={false}
    >
      <Suspense fallback={null}>
        <AddTvSeriesToStoreContainer id={tvSeries.id} />
        <ValidateWatchedStatus id={tvSeries.id} />
      </Suspense>
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
              <InfoLine
                tvSeries={tvSeries}
                className="md:gap-2 md:text-[0.8rem]"
              >
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
              </InfoLine>
            </div>
            {/* Note: we need to pass `tvSeries` here, because client component */}
            <WatchedProgress tvSeries={tvSeries} />
          </div>
        </div>
        <div className="w-full xl:w-4/5 2xl:w-3/5">
          <ExpandableText className="mb-6">
            {tvSeries.description}
          </ExpandableText>

          <div className="mb-6 flex items-center">
            <Suspense
              fallback={<SkeletonRating className="mr-auto md:mr-12" />}
            >
              <ImdbRating id={tvSeries.id} className="mr-auto md:mr-12" />
            </Suspense>
            <div className="flex gap-2 md:gap-3">
              <Suspense
                fallback={
                  <>
                    <SkeletonCircleButton />
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

          <div className="flex flex-wrap items-start gap-x-6 text-nowrap text-sm font-medium">
            {tvSeries.createdBy.length > 0 && (
              <ExpandableCreators creators={tvSeries.createdBy} />
            )}

            {/* {tvSeries.originCountry && (
              <p className="flex flex-nowrap items-center gap-x-1 font-medium leading-loose">
                <span className="opacity-60">Country:</span>
                <Link
                  key={tvSeries.originCountry.code}
                  className="hover:underline"
                  href={`/discover?with_origin_country=${tvSeries.originCountry.code}`}
                >
                  {tvSeries.originCountry.name}
                </Link>
              </p>
            )}

            {tvSeries.languages.length > 0 && (
              <ExpandableLanguages languages={tvSeries.languages} />
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
        <PreferredImagesForAdminContainer id={tvSeries.id} />
      </Suspense>
    </Page>
  );
}
