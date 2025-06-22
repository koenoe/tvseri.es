import { fetchGenresForTvSeries } from '@/lib/api';

import DiscoverGenres from './Genres';

export default async function DiscoverGenresContainer() {
  const genres = await fetchGenresForTvSeries();

  return <DiscoverGenres genres={genres} />;
}
