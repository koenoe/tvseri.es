import Page from '@/components/Page/Page';
import { fetchTrendingMovies } from '@/lib/tmdb';
import { notFound } from 'next/navigation';

import Spotlight from '@/components/Spotlight/Spotlight';

export default async function Home() {
  const trendingMovies = await fetchTrendingMovies();
  const spotlight = trendingMovies[0];

  if (!spotlight) {
    return notFound();
  }

  return (
    <Page
      backgroundColor={spotlight.backdropColor}
      backgroundImage={spotlight.backdropImage}
    >
      <Spotlight items={trendingMovies} />

      <div className="container relative">
        <div className="relative flex h-screen w-full items-center justify-center">
          rest of content
        </div>
      </div>
    </Page>
  );
}
