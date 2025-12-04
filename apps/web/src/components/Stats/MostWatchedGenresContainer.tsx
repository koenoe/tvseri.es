import { getStatsGenres } from '@/lib/api';

import MostWatchedGenres from './MostWatchedGenresLazy';

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

export default async function MostWatchedGenresContainer({
  userId,
  year,
}: Input) {
  const data = await getStatsGenres({ userId, year });

  if (data.length === 0) {
    return null;
  }

  return <MostWatchedGenres data={data} />;
}
