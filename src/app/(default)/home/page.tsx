import { cache, Suspense } from 'react';

import { notFound } from 'next/navigation';

import ApplePlusList from '@/components/List/ApplePlusList';
import BestSportsDocumentariesList from '@/components/List/BestSportsDocumentariesList';
import GenresList, { gapStyleOverride } from '@/components/List/GenresList';
import KoreasFinestList from '@/components/List/KoreasFinestList';
import MostAnticipatedList from '@/components/List/MostAnticipatedList';
import MostPopularThisMonthList from '@/components/List/MostPopularThisMonth';
import PopularBritishCrimeList from '@/components/List/PopularBritishCrimeList';
import TopRatedList from '@/components/List/TopRatedList';
import Page from '@/components/Page/Page';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import Spotlight from '@/components/Spotlight/Spotlight';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { fetchTrendingTvSeries } from '@/lib/tmdb';
import { type TvSeries } from '@/types/tv-series';

const _cachedTrendingTvSeries = async () => {
  const dynamoCacheKey = 'trending';
  const dynamoCachedItem = await getCacheItem<TvSeries[]>(dynamoCacheKey);
  if (dynamoCachedItem) {
    return dynamoCachedItem;
  }

  const items = await fetchTrendingTvSeries();

  await setCacheItem(dynamoCacheKey, items, {
    ttl: 28800, // 8 hours
  });

  return items;
};

const cachedTrendingTvSeries = cache(_cachedTrendingTvSeries);

export async function generateViewport() {
  const trendingTvSeries = await cachedTrendingTvSeries();
  const spotlight = trendingTvSeries[0];

  if (!spotlight) {
    return {};
  }

  return {
    themeColor: spotlight.backdropColor,
  };
}

export default async function HomePage() {
  const trendingTvSeries = await cachedTrendingTvSeries();
  const spotlight = trendingTvSeries[0];

  if (!spotlight) {
    return notFound();
  }

  return (
    <Page
      backgroundColor={spotlight.backdropColor}
      backgroundImage={spotlight.backdropImage}
      backgroundVariant="dynamic"
      backgroundContext="spotlight"
    >
      <Spotlight items={trendingTvSeries} className="mb-10 md:mb-20" />

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <MostPopularThisMonthList className="mb-10 md:mb-16" priority />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <TopRatedList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <ApplePlusList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense
        fallback={
          <SkeletonList
            className="mb-10 md:mb-16"
            variant="genre"
            style={gapStyleOverride}
            numberOfItems={5}
          />
        }
      >
        <GenresList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <KoreasFinestList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <PopularBritishCrimeList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <BestSportsDocumentariesList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList />}>
        <MostAnticipatedList />
      </Suspense>
    </Page>
  );
}
