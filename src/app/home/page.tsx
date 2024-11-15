import { Suspense } from 'react';

import { unstable_cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import ApplePlusList from '@/components/List/ApplePlusList';
import BestSportsDocumentariesList from '@/components/List/BestSportsDocumentariesList';
import GenresList, { gapStyleOverride } from '@/components/List/GenresList';
import KoreasFinestList from '@/components/List/KoreasFinestList';
import MostAnticipatedList from '@/components/List/MostAnticipatedList';
import PopularBritishCrimeList from '@/components/List/PopularBritishCrimeList';
import RecommendedForYouList from '@/components/List/RecommendedForYouList';
import TopRatedList from '@/components/List/TopRatedList';
import Page from '@/components/Page/Page';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import Spotlight from '@/components/Spotlight/Spotlight';
import { CACHE_LIFE_TWELVE_HOURS } from '@/constants';
import { fetchTrendingTvSeries } from '@/lib/tmdb';

const cachedTrendingTvSeries = async () => {
  'use cache';

  unstable_cacheLife(CACHE_LIFE_TWELVE_HOURS);

  const items = await fetchTrendingTvSeries();
  return items;
};

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
        <RecommendedForYouList className="mb-10 md:mb-16" priority />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <TopRatedList className="mb-10 md:mb-16" priority />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <ApplePlusList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <KoreasFinestList className="mb-10 md:mb-16" />
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
