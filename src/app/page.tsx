import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { fetchTrendingTvSeries } from '@/lib/tmdb';

import Page from '@/components/Page/Page';
import Spotlight from '@/components/Spotlight/Spotlight';
import TopRatedList from '@/components/List/TopRatedList';
import SkeletonList from '@/components/Skeletons/SkeletonList';
import PopularBritishCrimeList from '@/components/List/PopularBritishCrimeList';
import GenresList from '@/components/List/GenresList';

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

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <TopRatedList className="mb-10 md:mb-16" priority />
      </Suspense>

      <Suspense fallback={<SkeletonList className="mb-10 md:mb-16" />}>
        <PopularBritishCrimeList className="mb-10 md:mb-16" />
      </Suspense>

      <Suspense fallback={null}>
        <GenresList />
      </Suspense>
    </Page>
  );
}
