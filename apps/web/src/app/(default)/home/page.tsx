import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import ApplePlusList from '@/components/List/ApplePlusList';
import BestBritishCrimeList from '@/components/List/BestBritishCrimeList';
import BestSportsDocumentariesList from '@/components/List/BestSportsDocumentariesList';
import GenresList, { gapStyleOverride } from '@/components/List/GenresList';
import KoreasFinestList from '@/components/List/KoreasFinestList';
import MostAnticipatedList from '@/components/List/MostAnticipatedList';
import MostPopularThisMonthList from '@/components/List/MostPopularThisMonthList';
import TopRatedList from '@/components/List/TopRatedList';
import Page from '@/components/Page/Page';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import Spotlight from '@/components/Spotlight/Spotlight';
import { fetchTrendingTvSeries } from '@/lib/api';

async function cachedTrendingTvSeries() {
  'use cache';
  cacheLife('short');
  return fetchTrendingTvSeries();
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
      backgroundContext="spotlight"
      backgroundImage={spotlight.backdropImage}
      backgroundVariant="dynamic"
    >
      <Spotlight className="mb-10 md:mb-20" items={trendingTvSeries} />

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
            numberOfItems={5}
            style={gapStyleOverride}
            variant="genre"
          />
        }
      >
        <GenresList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <KoreasFinestList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <BestBritishCrimeList className="mb-10 md:mb-16" />
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
