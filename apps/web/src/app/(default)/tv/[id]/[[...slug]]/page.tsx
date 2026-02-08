import { cx } from 'class-variance-authority';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';

import { cachedTvSeries } from '@/app/cached';
import ActionButtons from '@/components/Buttons/ActionButtons';
import Cast from '@/components/Cast/Cast';
import ContentRating from '@/components/ContentRating/ContentRating';
import ExpandableCreators from '@/components/ExpandableList/ExpandableCreators';
import ExpandableText from '@/components/ExpandableText/ExpandableText';
import InfoLine from '@/components/InfoLine/InfoLine';
import KeywordsContainer from '@/components/Keywords/KeywordsContainer';
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
import WatchedProgress from '@/components/Watched/WatchedProgress';
import WatchProvider from '@/components/WatchProvider/WatchProvider';
import {
  fetchMostPopularTvSeriesThisMonth,
  fetchTrendingTvSeries,
} from '@/lib/api';
import getBaseUrl from '@/utils/getBaseUrl';
import isNumericId from '@/utils/isNumericId';

type Props = Readonly<{
  params: Promise<{ id: string; slug: string[] }>;
}>;

export async function generateStaticParams() {
  const [trending, popular] = await Promise.all([
    fetchTrendingTvSeries(),
    fetchMostPopularTvSeriesThisMonth(),
  ]);

  const seen = new Set<number>();
  const params: Array<{ id: string; slug: string[] }> = [];

  for (const item of [...trending, ...popular]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    params.push({ id: String(item.id), slug: [item.slug] });
  }

  return params;
}

export async function generateMetadata({
  params: paramsFromProps,
}: Props): Promise<Metadata> {
  const params = await paramsFromProps;

  if (!isNumericId(params.id)) {
    return {};
  }

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
    alternates: {
      canonical: canonicalUrl,
    },
    description: tvSeries.description,
    openGraph: {
      description: tvSeries.description,
      images: tvSeries.posterImage
        ? [
            {
              alt: `${tvSeries.title} poster`,
              height: 450,
              url: tvSeries.posterImage,
              width: 300,
            },
          ]
        : undefined,
      locale: 'en_US',
      siteName: 'tvseri.es',
      title: tvSeries.title,
      type: 'video.tv_show',
      url: canonicalUrl,
    },
    title: tvSeries.title,
  };
}

export default async function TvSeriesDetailsPage({
  params: paramsFromProps,
}: Props) {
  const params = await paramsFromProps;

  if (!isNumericId(params.id)) {
    return notFound();
  }

  const tvSeries = await cachedTvSeries(params.id, {
    includeImages: true,
  });

  if (!tvSeries || tvSeries.isAdult) {
    return notFound();
  }

  const slug = params.slug?.join('');

  if (tvSeries.slug && tvSeries.slug !== slug) {
    return permanentRedirect(`/tv/${params.id}/${tvSeries.slug}`);
  }

  return (
    <>
      <Page
        animateBackground
        backgroundColor={tvSeries.backdropColor}
        backgroundContext="page"
        backgroundImage={tvSeries.backdropImage}
        backgroundPriority
      >
        <div className="container">
          <div className="relative flex h-[calc(85vh-16rem)] items-end md:h-[calc(65vh-8rem)]">
            <div className="w-full xl:w-4/5 2xl:w-3/5">
              {tvSeries.titleTreatmentImage ? (
                <h1 className="relative mb-6 h-28 w-full md:h-40 md:w-[500px]">
                  <Image
                    alt={tvSeries.title}
                    className="max-w-[500px] object-contain object-bottom md:object-left-bottom"
                    draggable={false}
                    fetchPriority="high"
                    fill
                    id="title-treatment"
                    loading="eager"
                    priority
                    src={tvSeries.titleTreatmentImage}
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
                  className="md:gap-2 md:text-[0.8rem]"
                  tvSeries={tvSeries}
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
                <ImdbRating className="mr-auto md:mr-12" id={tvSeries.id} />
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
          <Suspense
            fallback={
              <SkeletonList className="mb-10 md:mb-16" variant="episode" />
            }
          >
            <EpisodesList className="mb-10 md:mb-16" item={tvSeries} />
          </Suspense>
        )}
        <Suspense fallback={<SkeletonList />}>
          <RecommendationsList id={tvSeries.id} />
        </Suspense>
        <Suspense fallback={null}>
          <AddTvSeriesToStoreContainer id={tvSeries.id} />
          <PreferredImagesForAdminContainer id={tvSeries.id} />
        </Suspense>
      </Page>
      <div
        className="relative w-full !bg-[var(--main-background-color)] py-10 md:py-16"
        style={{
          backgroundColor: tvSeries.backdropColor,
        }}
      >
        <div className="container">
          <h3 className="mb-4 text-2xl font-medium">Storyline</h3>
          <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-10">
            <div className="col-span-1 lg:col-span-2">
              <div className="relative rounded-xl bg-[rgba(255,255,255,0.035)] p-4 text-sm leading-loose">
                {tvSeries.description}
              </div>
            </div>
            <Suspense fallback={null}>
              <KeywordsContainer tvSeriesId={tvSeries.id} />
            </Suspense>
          </div>
          <h3 className="mb-6 text-2xl font-medium">Information</h3>
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6">
              {tvSeries.originalTitle && (
                <div className="flex flex-col flex-nowrap gap-1 text-sm">
                  <div className="opacity-60">Original title</div>
                  <div>{tvSeries.originalTitle}</div>
                </div>
              )}

              {tvSeries.status && (
                <div className="flex flex-col flex-nowrap gap-1 text-sm">
                  <div className="opacity-60">Status</div>
                  <div>{tvSeries.status}</div>
                </div>
              )}

              {tvSeries.type && (
                <div className="flex flex-col flex-nowrap gap-1 text-sm">
                  <div className="opacity-60">Type</div>
                  <div>{tvSeries.type}</div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {tvSeries.originCountry && (
                <div className="flex flex-col flex-nowrap gap-1 text-sm">
                  <div className="opacity-60">Country of origin</div>
                  <Link
                    className="inline-block w-auto self-start hover:underline"
                    href={{
                      pathname: '/discover',
                      query: {
                        with_origin_country: tvSeries.originCountry.code,
                      },
                    }}
                    prefetch={false}
                  >
                    {tvSeries.originCountry.name}
                  </Link>
                </div>
              )}

              <div className="flex flex-col flex-nowrap gap-1 text-sm">
                <div className="opacity-60">Spoken languages</div>
                <div className="flex flex-row flex-wrap gap-1 text-sm">
                  {tvSeries.languages.map((language) => (
                    <Link
                      className="after:content-[',_'] last:after:content-none hover:underline"
                      href={{
                        pathname: '/discover',
                        query: { with_original_language: language.code },
                      }}
                      key={language.code}
                      prefetch={false}
                    >
                      {language.englishName}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {tvSeries.network && (
              <div
                className={cx(
                  'flex flex-col flex-nowrap text-sm',
                  tvSeries.network.logo ? 'gap-3' : 'gap-1',
                )}
              >
                <div className="opacity-60">Network</div>
                <Link
                  href={{
                    pathname: '/discover',
                    query: { with_networks: tvSeries.network.id },
                  }}
                  prefetch={false}
                >
                  {tvSeries.network.logo ? (
                    <Image
                      alt={tvSeries.network.name}
                      className="brightness-0 invert"
                      height={96}
                      src={tvSeries.network.logo}
                      unoptimized
                      width={96}
                    />
                  ) : (
                    <span>{tvSeries.network.name}</span>
                  )}
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-black/10" />
      </div>
    </>
  );
}
