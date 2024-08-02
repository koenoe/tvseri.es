import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { fetchTrendingTvSeries } from '@/lib/tmdb';

import Page from '@/components/Page/Page';
import Spotlight from '@/components/Spotlight/Spotlight';
import TopRatedList from '@/components/List/TopRatedList';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import PopularBritishCrimeList from '@/components/List/PopularBritishCrimeList';

export default async function Home() {
  const trendingTvSeries = await fetchTrendingTvSeries();
  const spotlight = trendingTvSeries[0];

  if (!spotlight) {
    return notFound();
  }

  return (
    <Page
      backgroundColor={spotlight.backdropColor}
      backgroundImage={spotlight.backdropImage}
    >
      <Spotlight items={trendingTvSeries} className="mb-10 md:mb-20" />

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-20" />}>
        <TopRatedList className="mb-10 md:mb-20" priority />
      </Suspense>

      <Suspense fallback={<SkeletonList />}>
        <PopularBritishCrimeList />
      </Suspense>
    </Page>
  );
}
