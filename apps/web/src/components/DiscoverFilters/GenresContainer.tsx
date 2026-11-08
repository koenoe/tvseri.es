import { fetchGenresForTvSeries } from '@/lib/api';

import DiscoverGenres from './Genres';

export default async function DiscoverGenresContainer() {
  const genres = await fetchGenresForTvSeries();
  // Note: only send what the client component reads
  const options = genres.map(({ id, name }) => ({ id, name }));

  return <DiscoverGenres genres={options} />;
}
