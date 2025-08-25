import { cachedTvSeries, cachedUniqueWatchedByYear } from '@/app/cached';

import MostWatchedGenres from './MostWatchedGenresLazy';

type GenreStat = {
  genre: string;
  count: number;
};

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

const getGenreStats = async (input: Input): Promise<GenreStat[]> => {
  const watchedItems = await cachedUniqueWatchedByYear({
    userId: input.userId,
    year: input.year,
  });

  if (watchedItems.length === 0) {
    return [];
  }

  const seriesWithGenres = await Promise.all(
    watchedItems.map((item) => cachedTvSeries(item.id)),
  );
  const genreCounts = new Map<string, number>();

  seriesWithGenres
    .filter((genre) => !!genre)
    .forEach((series) => {
      series.genres.forEach((genre) => {
        const currentCount = genreCounts.get(genre.name) || 0;
        genreCounts.set(genre.name, currentCount + 1);
      });
    });

  return [...genreCounts.entries()]
    .map(([genre, count]) => ({ count, genre }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Limit to top 10 genres
};

const cachedGenreStats = async (input: Input) => {
  const stats = await getGenreStats(input);
  return stats;
};

export default async function MostWatchedGenresContainer({
  userId,
  year,
}: Input) {
  const data = await cachedGenreStats({
    userId,
    year,
  });

  if (data.length === 0) {
    return null;
  }

  return <MostWatchedGenres data={data} />;
}
