import { cachedTvSeries, cachedWatchedByYear } from '@/lib/cached';
import sleep from '@/utils/sleep';

import WorldMap from './WorldMap';

type CountryStats = Record<string, number>;

const cachedTvSeriesWithSleep = async (id: number) => {
  const result = await cachedTvSeries(id);
  await sleep(20); // 20ms = ~50 requests per second
  return result;
};

export const getCountryStats = async (
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

export default async function WorldMapContainer({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number | string;
}>) {
  const data = await getCountryStats({
    userId,
    year,
  });

  return <WorldMap data={data} />;
}
