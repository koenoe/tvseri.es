import { cachedTvSeries, cachedWatchedByYear } from '@/lib/cached';
import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import sleep from '@/utils/sleep';

import WorldMap from './WorldMap';

type CountryStats = Record<string, number>;

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

const cachedTvSeriesWithSleep = async (id: number) => {
  const result = await cachedTvSeries(id);
  await sleep(20); // 20ms = ~50 requests per second
  return result;
};

const getCountryStats = async (
  input: Readonly<{
    userId: string;
    year: number | string;
  }>,
): Promise<CountryStats> => {
  const watchedItems = await cachedWatchedByYear({
    userId: input.userId,
    year: input.year,
  });

  const uniqueSeriesIds = [
    ...new Set(watchedItems.map((item) => item.seriesId)),
  ];

  const seriesWithCountries = await Promise.all(
    uniqueSeriesIds.map((id) => cachedTvSeriesWithSleep(id)),
  );

  const countryStats: CountryStats = {};

  seriesWithCountries.forEach((series) => {
    series!.countries.forEach((country) => {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const countryName = displayNames.of(country.code) ?? country.name;
      countryStats[countryName] = (countryStats[countryName] || 0) + 1;
    });
  });

  return countryStats;
};

const cachedCountryStats = async (input: Input) => {
  const key = `most-watched-countries:${input.userId}_${input.year}`;
  const cachedValue = await getCacheItem<CountryStats>(key);
  if (cachedValue) {
    return cachedValue;
  }

  const stats = await getCountryStats(input);

  await setCacheItem(key, stats, { ttl: 3600 });

  return stats;
};

export default async function WorldMapContainer({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number | string;
}>) {
  const data = await cachedCountryStats({
    userId,
    year,
  });

  return <WorldMap data={data} />;
}
