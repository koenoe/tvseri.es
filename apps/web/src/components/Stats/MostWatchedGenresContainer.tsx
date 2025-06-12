import { cachedUniqueWatchedByYear, cachedTvSeries } from '@/app/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';

import MostWatchedGenres from './MostWatchedGenres';

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

const cachedGenreStats = async (input: Input) => {
  const key = `most-watched-genres:${input.userId}_${input.year}`;
  const cachedValue = await getCacheItem<GenreStat[]>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const stats = await getGenreStats(input);

  await setCacheItem(key, stats, { ttl: 3600 });

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
