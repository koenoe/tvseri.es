import { Suspense } from 'react';

import { cachedWatchedByYear, cachedTvSeries } from '@/app/cached';
import { fetchWorldMap } from '@/lib/api';

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

function generateCountryData(data: Record<string, number>) {
  const maxViews = Math.max(...Object.values(data));
  const countryData: Record<
    string,
    { color: string; hoverColor: string; content: { views: number } }
  > = {};
  const minOpacity = 0.3;

  Object.entries(data).forEach(([country, views]) => {
    const opacity = minOpacity + (views / maxViews) * (1 - minOpacity);
    countryData[country] = {
      color: `rgba(255, 0, 128, ${opacity})`,
      hoverColor: '#00B8D4',
      content: { views },
    };
  });

  return countryData;
}

export default async function WorldMapContainer({
  userId,
  year,
}: Readonly<{
  userId: string;
  year: number | string;
}>) {
  const [data, { countries, paths }] = await Promise.all([
    cachedCountryStats({
      userId,
      year,
    }),
    fetchWorldMap(),
  ]);

  const formattedData = generateCountryData(data);

  return (
    <Suspense fallback={<div className="relative aspect-[192/95] w-full" />}>
      <WorldMap data={formattedData} countries={countries} paths={paths} />
    </Suspense>
  );
}
