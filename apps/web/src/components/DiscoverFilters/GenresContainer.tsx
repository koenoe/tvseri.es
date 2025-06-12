import { fetchGenresForTvSeries } from '@/lib/tmdb';

import DiscoverGenres from './Genres';

export default async function DiscoverGenresContainer() {
  const genres = await fetchGenresForTvSeries();

  return <DiscoverGenres genres={genres} />;
}
