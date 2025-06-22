import { Suspense } from 'react';

import { cachedWatchedByYear, cachedTvSeries } from '@/app/cached';

import WorldMap from './WorldMap';

type CountryStats = Record<string, number>;

type Input = Readonly<{
  userId: string;
  year: number | string;
}>;

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

  const uniqueSeries = await Promise.all(
    uniqueSeriesIds.map((id) => cachedTvSeries(id)),
  );

  const seriesWithCountries = uniqueSeries.filter(
    (series) => series && series.countries,
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
  const stats = await getCountryStats(input);
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

  return (
    <Suspense fallback={<div className="relative aspect-[192/95] w-full" />}>
      <WorldMap data={data} />
    </Suspense>
  );
}
