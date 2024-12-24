import { cachedTvSeries, cachedWatchedByYear } from '@/lib/cached';
import { fetchGenresForTvSeries } from '@/lib/tmdb';
import sleep from '@/utils/sleep';

import MostWatchedGenres from './MostWatchedGenres';

type GenreStat = {
  genre: string;
  count: number;
};

const cachedTvSeriesWithSleep = async (id: number) => {
  const result = await cachedTvSeries(id);
  await sleep(20); // 20ms = ~50 requests per second
  return result;
};

export const getGenreStats = async (
  input: Readonly<{
    userId: string;
    year: number | string;
  }>,
): Promise<GenreStat[]> => {
  const [genres, watchedItems] = await Promise.all([
    fetchGenresForTvSeries(),
    cachedWatchedByYear({
      userId: input.userId,
      year: input.year,
    }),
  ]);

  if (watchedItems.length === 0) {
    return [];
  }

  const uniqueSeriesIds = [
    ...new Set(watchedItems.map((item) => item.seriesId)),
  ];

  const seriesWithGenres = await Promise.all(
    uniqueSeriesIds.map((id) => cachedTvSeriesWithSleep(id)),
  );

  const genreCounts = new Map<string, number>();
  genres.forEach((genre) => {
    genreCounts.set(genre.name, 0);
  });

  seriesWithGenres.forEach((series) => {
    series!.genres.forEach((genre) => {
      const currentCount = genreCounts.get(genre.name) || 0;
      genreCounts.set(genre.name, currentCount + 1);
    });
  });

  return [...genreCounts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
};

export default async function MostWatchedGenresContainer({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number | string;
}>) {
  const data = await getGenreStats({
    userId,
    year,
  });

  if (data.length === 0) {
    return null;
  }

  return <MostWatchedGenres data={data} />;
}
